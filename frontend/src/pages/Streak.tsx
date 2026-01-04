// export default function Streak() {
//   return (
//     <div className="p-8 text-white">
//       <h2 className="text-2xl font-semibold text-white">Streak</h2>
//       <p className="text-white/90">(blank)</p>
//     </div>
//   )
// }

import { useMemo, useEffect, useState, useContext } from "react"
import { getPomodoroTotals, getPomodoroStats, getStreak, getTasks } from "../PomodoroApi"
import AuthApi from "../AuthApi"

type Task = {
  id: string
  title?: string
  dueDate?: string
  completed?: boolean
  dueTime?: string
}

const STORAGE_KEY = "study-buddy.tasks.v2"

function toISO(dateStr?: string): string {
  if (!dateStr) return ""
  dateStr = dateStr.trim()
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-")
    const yearCandidate = typeof parts[0] === "string" ? parts[0].trim() : ""
    if (parts.length >= 3 && yearCandidate.length === 4 && /^\d{4}$/.test(yearCandidate)) {
      return dateStr
    }
  }
  if (dateStr.includes("/")) {
    const [day = "", month = "", year = ""] = dateStr.split("/").map((x) => x.trim())
    if (day && month && year) {
      return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
  }
  const parseDate = new Date(dateStr)
  if (Number.isNaN(parseDate.getTime())) return ""
  return `${parseDate.getFullYear()}-${String(parseDate.getMonth() + 1).padStart(2, "0")}-${String(
    parseDate.getDate()
  ).padStart(2, "0")}`
}

export default function Streak() {
  const [backendTotalMinutes, setBackendTotalMinutes] = useState<number | null>(null)
  const [backendCurrentStreak, setBackendCurrentStreak] = useState<number | null>(null)
  const [backendTasksCompleted, setBackendTasksCompleted] = useState<number | null>(null)
  const apiAuth = useContext(AuthApi)
  const isAuthenticated = Boolean(apiAuth?.auth)

  // When auth state changes to authenticated, fetch tasks from backend
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (isAuthenticated) {
          const tasks = await getTasks()
          if (!mounted) return
          const completed = Array.isArray(tasks) ? tasks.filter((t) => t.completed === true).length : 0
          setBackendTasksCompleted(completed)
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      mounted = false
    }
  }, [isAuthenticated])

  const tasks: Task[] = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          // prefer stats endpoint which includes running sessions
          const stats = await getPomodoroStats()
          if (!mounted) return
          setBackendTotalMinutes(stats.totalMinutes ?? Math.floor((stats.totalSeconds ?? 0) / 60))
          // fetch streak from stats (still authoritative for streak)
          try {
            const streakStats = await getStreak()
            if (!mounted) return
            setBackendCurrentStreak(streakStats.currentStreak ?? 0)
            if (typeof streakStats.completedTasks === "number") setBackendTasksCompleted(streakStats.completedTasks)
          } catch {
            // ignore
          }

          // if authenticated, fetch tasks from server to count completed tasks
          try {
            if (isAuthenticated) {
              const tasks = await getTasks()
              if (!mounted) return
              const completed = Array.isArray(tasks) ? tasks.filter((t) => t.completed === true).length : 0
              setBackendTasksCompleted(completed)
            }
          } catch {
            // ignore
          }
        } catch (err) {
          // ignore — fallback to local calculation
          console.error("failed to load pomodoro stats", err)
        }
      })()
    // listen for updates when a pomodoro session is stopped
    const onUpdate = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail
        if (detail) {
          // If event provides stats (from /api/pomodoro/stats), prefer its totalMinutes
          if (typeof detail.totalMinutes === "number") {
            setBackendTotalMinutes(detail.totalMinutes)
          } else {
            // otherwise fall back to fetching totals (note: /totals excludes running sessions)
            void (async () => {
              try {
                const totals = await getPomodoroTotals()
                setBackendTotalMinutes(totals.totalMinutes ?? Math.floor((totals.totalSeconds ?? 0) / 60))
              } catch {
                setBackendTotalMinutes(detail.totalMinutes ?? Math.floor((detail.totalSeconds ?? 0) / 60))
              }
            })()
          }
          // only update current streak when the dispatched event includes it
          if (detail.currentStreak !== undefined && detail.currentStreak !== null) {
            setBackendCurrentStreak(detail.currentStreak)
          }
          // update completed tasks when provided by the event (e.g. login/signup)
          if (detail.completedTasks !== undefined && detail.completedTasks !== null) {
            setBackendTasksCompleted(detail.completedTasks)
          }
        }
      } catch { }
    }
    window.addEventListener("pomodoro:updated", onUpdate as EventListener)
    const onTasksUpdate = (e: Event) => {
      try {
        const d = (e as CustomEvent).detail
        if (d && typeof d.completed === "number") setBackendTasksCompleted(d.completed)
      } catch {}
    }
    window.addEventListener("tasks:updated", onTasksUpdate as EventListener)
    return () => {
      mounted = false
      window.removeEventListener("pomodoro:updated", onUpdate as EventListener)
      window.removeEventListener("tasks:updated", onTasksUpdate as EventListener)
    }
  }, [isAuthenticated])

  // read persisted completed count (if any) as fallback
  useEffect(() => {
    try {
      const raw = localStorage.getItem("study-buddy.completedCount.v1")
      if (raw != null) {
        const n = Number(raw)
        if (!Number.isNaN(n)) setBackendTasksCompleted(n)
      }
    } catch {}
  }, [])

  const tasksWithISO = useMemo(
    () =>
      tasks.map((t) => ({
        ...t,
        _iso: toISO(t.dueDate),
      })),
    [tasks]
  )

  // Calculate stats
  const completedCount = tasksWithISO.filter((t) => t.completed === true).length

  // Prefer backend total minutes if available
  const totalMinutes = backendTotalMinutes ?? 0

  // Daily study streak (count consecutive days with at least 1 completed task)
  const localDailyStreak = useMemo(() => {
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      const tasksOnDay = tasksWithISO.filter((t) => t._iso === iso && t.completed).length
      if (tasksOnDay > 0) {
        streak++
      } else {
        break
      }
    }
    return streak
  }, [tasksWithISO])

  const dailyStreak = backendCurrentStreak ?? localDailyStreak

  // Tasks completed (prefer backend count when available)
  const tasksCompleted = backendTasksCompleted ?? completedCount

  // Badge progression with custom unlock rules:
  // - 10 tasks badge unlocks at 10
  // - 25 tasks badge unlocks early at 15 (as requested)
  // - 50, 75, 100 unlock at their respective values
  const badgeDefinitions = [
    { threshold: 10, unlockAt: 10 },
    { threshold: 25, unlockAt: 25 },
    { threshold: 50, unlockAt: 50 },
    { threshold: 75, unlockAt: 75 },
    { threshold: 100, unlockAt: 100 },
  ]

  const badges = badgeDefinitions.map((def, i) => ({
    id: i,
    threshold: def.threshold,
    unlocked: tasksCompleted >= def.unlockAt,
    label: `${def.threshold} tasks`,
  }))

  return (
    <div className="p-6 text-black">
      <h2 className="text-2xl font-semibold mb-6">Study Streak</h2>

      {/* 3 Streak cards side by side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Hours Studied */}
        <div className="bg-white p-6 rounded shadow text-center">
          <img src="/flames/orange_flame.png" alt="Minutes flame" className="w-16 h-16 mx-auto mb-2" />
          <h3 className="font-semibold text-lg mb-2">Total Minutes Studied</h3>
          <p className="text-3xl font-bold text-blue-600">{totalMinutes}</p>
          <p className="text-sm text-gray-600 mt-1">minutes</p>
        </div>

        {/* Daily Study Streak */}
        <div className="bg-white p-6 rounded shadow text-center">
          <img src="/flames/green_flame.png" alt="Streak flame" className="w-16 h-16 mx-auto mb-2" />
          <h3 className="font-semibold text-lg mb-2">Daily Study Streak</h3>
          <p className="text-3xl font-bold text-orange-600">{dailyStreak}</p>
          <p className="text-sm text-gray-600 mt-1">days</p>
        </div>

        {/* Tasks Completed */}
        <div className="bg-white p-6 rounded shadow text-center">
          <img src="/flames/violet_flame.png" alt="Tasks flame" className="w-16 h-16 mx-auto mb-2" />
          <h3 className="font-semibold text-lg mb-2">Tasks Completed</h3>
          <p className="text-3xl font-bold text-red-600">{tasksCompleted}</p>
          <p className="text-sm text-gray-600 mt-1">tasks</p>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white p-6 rounded shadow">
        <h3 className="font-semibold text-lg mb-4">Achievements</h3>
        <div className="flex justify-center gap-6 flex-wrap">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center p-4 rounded transition-all"
            >
              {/* Badge image - grey or golden based on unlocked status */}
              <img
                src={badge.unlocked ? "/badges/golden_badge.png" : "/badges/grey_badge.png"}
                alt={badge.label}
                className="w-16 h-16 mb-2"
              />
              <p className="text-sm font-semibold text-center">{badge.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}