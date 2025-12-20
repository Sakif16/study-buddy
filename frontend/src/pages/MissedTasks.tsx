import { useEffect, useMemo, useState } from "react"

type Task = {
  id: string
  title?: string
  dueDate?: string | null // dd/mm/yyyy
  completed?: boolean
}

/* -------- helpers -------- */

// parse "dd/mm/yyyy" safely
function parseDDMMYYYY(dateStr: string): Date | null {
  const [dd, mm, yyyy] = dateStr.split("/")
  if (!dd || !mm || !yyyy) return null

  const d = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd)
  )

  return isNaN(d.getTime()) ? null : d
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/* -------- component -------- */

export default function MissedTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  // fetch tasks from backend (user-specific)
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch("http://localhost:3000/api/tasks", { credentials: "include" })
        if (!res.ok) {
          console.error("/api/tasks fetch failed", res.status)
          return
        }
        const body = await res.json()
        // backend returns an array directly; some environments may wrap it
        const data = Array.isArray(body) ? body : body?.tasks ?? null
        if (Array.isArray(data)) setTasks(data)
        else console.error("unexpected /api/tasks response", body)
      } catch (err) {
        console.error("missed tasks fetch error", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const today = startOfDay(new Date())

  /* -------- missed tasks -------- */
  const missed = useMemo(() => {
    return tasks.filter((t) => {
      if (t.completed) return false
      if (!t.dueDate) return false

      const due = parseDDMMYYYY(t.dueDate)
      if (!due) return false

      return startOfDay(due).getTime() < today.getTime()
    })
  }, [tasks, today])

  /* -------- last 7 days chart data -------- */
  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return startOfDay(d)
    })
  }, [])

  const counts = useMemo(() => {
    return days.map((day) => {
      return tasks.reduce((acc, t) => {
        if (t.completed || !t.dueDate) return acc

        const due = parseDDMMYYYY(t.dueDate)
        if (!due) return acc

        if (
          startOfDay(due).getTime() === day.getTime() &&
          startOfDay(due).getTime() < today.getTime()
        ) {
          return acc + 1
        }
        return acc
      }, 0)
    })
  }, [tasks, days, today])

  const maxCount = Math.max(...counts, 1)

  return (
    <div className="p-8 text-white">
      <h2 className="text-2xl font-semibold mb-4">Missed Tasks</h2>

      <div className="max-w-4xl bg-[#08917e] rounded-lg p-6">
        {loading ? (
          <div>Loading…</div>
        ) : (
          <>
            {/* total missed */}
            <div className="mb-6">
              <div className="text-sm text-white/80">Total missed tasks</div>
              <div className="text-3xl font-bold">{missed.length}</div>
            </div>

            <div className="mb-3 text-sm text-white/80">Missed tasks (by overdue days)</div>

            {/* Header row for missed tasks */}
            <div className="mb-2 flex items-center gap-3">
              <div className="w-48 text-sm font-semibold text-white/90">Title</div>
              <div className="w-36 text-sm font-semibold text-white/90">Due Date</div>
              <div className="flex-1 text-sm font-semibold text-white/90">Days Ago</div>
            </div>

            {/* list + bars */}
            <div>

              {missed.length === 0 ? (
                <div className="text-sm text-white/60">
                  No missed tasks 🎉
                </div>
              ) : (
                (() => {
                  const withOverdue = missed.map((t) => {
                    const due = parseDDMMYYYY(t.dueDate!)
                    const daysOverdue = Math.max(
                      0,
                      Math.floor(
                        (today.getTime() - startOfDay(due!).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    )
                    return { task: t, daysOverdue }
                  })

                  const maxOverdue = Math.max(
                    ...withOverdue.map((w) => w.daysOverdue),
                    1
                  )

                  return withOverdue.map(({ task, daysOverdue }) => {
                    const pct = Math.round(
                      (daysOverdue / maxOverdue) * 100
                    )

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 mb-2"
                      >
                        <div className="w-48 text-sm">
                          {task.title || "(no title)"}
                        </div>

                        <div className="w-32 text-sm opacity-80">
                          {task.dueDate}
                        </div>

                        <div className="flex-1 bg-white/10 rounded h-6 relative">
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-white/60 rounded"
                            style={{ width: `${pct}%` }}
                          />
                          <div className="absolute left-3 inset-y-0 flex items-center text-black text-sm font-medium">
                            {daysOverdue}d
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()
              )}
            </div>

            {/* removed 7-day bar chart per UI update */}
          </>
        )}
      </div>
    </div>
  )
}

