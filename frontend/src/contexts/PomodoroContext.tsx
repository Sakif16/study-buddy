import React, { createContext, useContext, useEffect, useRef, useState } from "react"
import { startPomodoro, stopPomodoro, getPomodoroStats, listPomodoros } from "../PomodoroApi"

type PomodoroContextType = {
  workMinutes: number
  breakMinutes: number
  setWorkMinutes: (n: number) => void
  setBreakMinutes: (n: number) => void
  isWork: boolean
  setIsWork: (v: boolean) => void
  isRunning: boolean
  hasStarted: boolean
  timeLeft: number
  currentSessionId: string | null
  toggleStart: () => Promise<void>
  resetTimer: () => void
  skipSession: () => void
}

const PomodoroContext = createContext<PomodoroContextType | null>(null)

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [workMinutes, setWorkMinutes] = useState<number>(25)
  const [breakMinutes, setBreakMinutes] = useState<number>(5)

  const [isWork, setIsWork] = useState<boolean>(true)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [hasStarted, setHasStarted] = useState<boolean>(false)
  const [timeLeft, setTimeLeft] = useState<number>(() => workMinutes * 60)

  const intervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null)
  const prevVals = useRef({ workMinutes, breakMinutes, isWork })
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  useEffect(() => {
    const prev = prevVals.current
    const changed =
      workMinutes !== prev.workMinutes || breakMinutes !== prev.breakMinutes || isWork !== prev.isWork

    if (!isRunning && changed) {
      setTimeLeft((isWork ? workMinutes : breakMinutes) * 60)
    }
    prevVals.current = { workMinutes, breakMinutes, isWork }
  }, [workMinutes, breakMinutes, isWork, isRunning])

  useEffect(() => {
    if (isRunning) {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((t) => Math.max(0, t - 1))
      }, 1000)
    } else {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning])

  // While running, periodically compute and broadcast up-to-date stats
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const MIN_ACTIVE_SECONDS = 120

    const computeAndDispatch = async () => {
      try {
        const sessions = await listPomodoros()
        const now = new Date()
        // Sum durations, treating active sessions (duration == null) as now - startAt
        let totalSeconds = 0
        const dailyMap = new Map<string, number>()
        const dayKey = (d: Date) => d.toISOString().slice(0, 10)

        for (const s of sessions) {
          const start = new Date(s.startAt)
          const dur = s.duration ?? Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000))
          const key = dayKey(start)
          const prev = dailyMap.get(key) ?? 0
          dailyMap.set(key, prev + dur)
          totalSeconds += dur
        }

        const dailyTotals = Array.from(dailyMap.entries()).map(([date, seconds]) => ({ date, seconds }))

        // active days are those with >= MIN_ACTIVE_SECONDS
        const activeDays = new Set(dailyTotals.filter((d) => d.seconds >= MIN_ACTIVE_SECONDS).map((d) => d.date))

        // current streak
        const dayMs = 24 * 60 * 60 * 1000
        let currentStreak = 0
        let cursor = new Date(new Date().toISOString().slice(0, 10))
        while (true) {
          const key = cursor.toISOString().slice(0, 10)
          if (activeDays.has(key)) {
            currentStreak++
            cursor = new Date(cursor.getTime() - dayMs)
          } else {
            break
          }
        }

        // longest streak
        const sortedDays = Array.from(activeDays).sort()
        let longestStreak = 0
        let run = 0
        let prevDate: string | null = null
        for (const d of sortedDays) {
          if (prevDate === null) {
            run = 1
          } else {
            const prev = new Date(prevDate)
            const curr = new Date(d)
            if (curr.getTime() - prev.getTime() === dayMs) {
              run++
            } else {
              run = 1
            }
          }
          if (run > longestStreak) longestStreak = run
          prevDate = d
        }

        const totalHours = Math.floor(totalSeconds / 3600)
        const detail = { totalSeconds, totalHours, dailyTotals, currentStreak, longestStreak }
        window.dispatchEvent(new CustomEvent("pomodoro:updated", { detail }))
      } catch (err) {
        // ignore errors — best-effort
        console.error("pomodoro:stats poll failed", err)
      }
    }

    if (isRunning) {
      // run immediately then every 15 seconds
      void computeAndDispatch()
      timer = setInterval(() => void computeAndDispatch(), 15_000)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isRunning])

  useEffect(() => {
    if (timeLeft !== 0) return

    ;(async () => {
      if (currentSessionId) {
        try {
          await stopPomodoro(currentSessionId)
          try {
            const stats = await getPomodoroStats()
            window.dispatchEvent(new CustomEvent("pomodoro:updated", { detail: stats }))
          } catch (e) {}
        } catch (err) {
          console.error("failed to auto-stop pomodoro", err)
        }
        setCurrentSessionId(null)
      }

      setIsWork((prev) => {
        const next = !prev
        setTimeLeft(next ? workMinutes * 60 : breakMinutes * 60)
        return next
      })
    })()
  }, [timeLeft, workMinutes, breakMinutes, currentSessionId])

  const toggleStart = async () => {
    if (!isRunning) {
      try {
        const created = await startPomodoro(isWork ? "work" : "break")
        setCurrentSessionId(created.id ?? null)
        setHasStarted(true)
        setIsRunning(true)
      } catch (err) {
        console.error("failed to start pomodoro", err)
      }
    } else {
      try {
        if (currentSessionId) {
          await stopPomodoro(currentSessionId)
          try {
            const stats = await getPomodoroStats()
            window.dispatchEvent(new CustomEvent("pomodoro:updated", { detail: stats }))
          } catch (e) {}
        }
      } catch (err) {
        console.error("failed to stop pomodoro", err)
      } finally {
        setCurrentSessionId(null)
        setIsRunning(false)
      }
    }
  }

  const resetTimer = () => {
    setIsRunning(false)
    setIsWork(true)
    setTimeLeft(workMinutes * 60)
    setHasStarted(false)
  }

  const skipSession = () => {
    setIsWork((prev) => {
      const next = !prev
      setTimeLeft(next ? workMinutes * 60 : breakMinutes * 60)
      return next
    })
  }

  return (
    <PomodoroContext.Provider
      value={{
        workMinutes,
        breakMinutes,
        setWorkMinutes,
        setBreakMinutes,
        isWork,
        setIsWork,
        isRunning,
        hasStarted,
        timeLeft,
        currentSessionId,
        toggleStart,
        resetTimer,
        skipSession,
      }}
    >
      {children}
    </PomodoroContext.Provider>
  )
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error("usePomodoro must be used within PomodoroProvider")
  return ctx
}

export default PomodoroContext
