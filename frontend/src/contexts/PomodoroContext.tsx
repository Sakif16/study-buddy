import { createContext, useContext, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { startPomodoro, stopPomodoro, getPomodoroStats } from "../PomodoroApi"
import AuthApi from "../AuthApi"

type PomodoroContextType = {
  workMinutes: number
  breakMinutes: number
  setWorkMinutes: React.Dispatch<React.SetStateAction<number>>
  setBreakMinutes: React.Dispatch<React.SetStateAction<number>>
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

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const authApi = useContext(AuthApi)
  // track current user id so provider resets when a different user logs in
  const currentUserIdRef = useRef<string | null>(authApi?.user?.id ?? null)

  const [workMinutes, setWorkMinutes] = useState<number>(25)
  const [breakMinutes, setBreakMinutes] = useState<number>(5)

  const [isWork, setIsWork] = useState<boolean>(true)
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [hasStarted, setHasStarted] = useState<boolean>(false)
  const [timeLeft, setTimeLeft] = useState<number>(() => workMinutes * 60)

  useEffect(() => {
    const newId = authApi?.user?.id ?? null
    const prevId = currentUserIdRef.current
    if (prevId !== newId) {
      // user changed (login/logout/switch): reset local timer state
      // Do NOT attempt to stop previous backend session here because credentials may have changed.
      setIsRunning(false)
      setHasStarted(false)
      setIsWork(true)
      setTimeLeft(workMinutes * 60)
      setCurrentSessionId(null)
      currentUserIdRef.current = newId
    }
  }, [authApi?.user?.id, workMinutes])

  

  const intervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null)
  const prevVals = useRef({ workMinutes, breakMinutes, isWork })
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  // Track base total seconds at session start so we can emit live totals without polling the server every second
  const baseTotalSecondsRef = useRef<number | null>(null)
  const sessionStartAtRef = useRef<Date | null>(null)

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
        try {
          // Emit live totals every second using locally computed values when possible
          if (currentSessionId && sessionStartAtRef.current) {
            const now = new Date()
            const elapsed = Math.max(0, Math.floor((now.getTime() - sessionStartAtRef.current.getTime()) / 1000))
            const base = baseTotalSecondsRef.current ?? 0
            const totalSeconds = base + elapsed
            const totalMinutes = Math.floor(totalSeconds / 60)
            window.dispatchEvent(new CustomEvent("pomodoro:updated", { detail: { totalSeconds, totalMinutes } }))
          }
        } catch {
          // ignore
        }
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
  }, [isRunning, currentSessionId])

  // While running, periodically compute and broadcast up-to-date stats
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const computeAndDispatch = async () => {
      try {
        const stats = await getPomodoroStats()
        window.dispatchEvent(new CustomEvent("pomodoro:updated", { detail: stats }))
      } catch (err) {
        console.error("pomodoro:stats poll failed", err)
      }
    }

    if (isRunning) {
      // run immediately then every 15 seconds
      void computeAndDispatch()
      timer = setInterval(() => void computeAndDispatch(), 5_000)
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
          } catch {}
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
        // record session start time and base totals so we can compute live totals locally
        try {
          sessionStartAtRef.current = created.startAt ? new Date(created.startAt) : new Date()
          const stats = await getPomodoroStats()
          baseTotalSecondsRef.current = stats.totalSeconds ?? (stats.totalMinutes ?? 0) * 60
          // dispatch an immediate update so UI reflects start instantly
          const totalSeconds = baseTotalSecondsRef.current
          const totalMinutes = Math.floor((totalSeconds ?? 0) / 60)
          window.dispatchEvent(new CustomEvent("pomodoro:updated", { detail: { totalSeconds, totalMinutes } }))
        } catch (e) {
          console.error("failed to initialize live pomodoro totals", e)
        }
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
          } catch {}
        }
      } catch (err) {
        console.error("failed to stop pomodoro", err)
      } finally {
        setCurrentSessionId(null)
        // clear local live tracking
        baseTotalSecondsRef.current = null
        sessionStartAtRef.current = null
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
