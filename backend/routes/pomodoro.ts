import express from "express"
import { z } from "zod"
import { db } from "../db.js"
import type { Prisma } from "../generated/prisma/client.js"

// Module-level types used across handlers
type PomodoroRecord = {
  id: string
  startAt: Date | string
  endAt?: Date | null
  duration?: number | null
  type?: string | null
  createdAt?: Date
}

type TotalsDebugRow = {
  id: string
  type?: string | null
  startAt: Date | string
  endAt?: Date | null
  durationRecorded?: number | null
  counted?: boolean
  contributionSeconds?: number
  reason?: string
}

type DiagnosticsRow = {
  id: string
  type?: string | null
  startAt: Date | string
  endAt?: Date | null
  durationRecorded?: number | null
  computedDuration?: number
  futureStart?: boolean
  tooLong?: boolean
  runningTooLong?: boolean
  createdAt?: Date | null
}

type FixChange = { duration?: number; endAt?: Date; startAt?: Date }
type Fix = { id: string; reason: string; before: FixChange; after: FixChange }

const router = express.Router()

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: "unauthorized" })
  }
  next()
}

router.use(requireAuth)

const StartSchema = z.object({
  type: z.enum(["work", "break"]).optional(),
  startAt: z.string().optional(), // ISO string
})

const StopSchema = z.object({
  sessionId: z.string(),
  endAt: z.string().optional(), // ISO string
})

// POST /api/pomodoro/start
router.post("/start", async (req, res) => {
  try {
    const payload = StartSchema.parse(req.body)
    type SessionWithUser = { user: { id: string } }
    const userId = ((req.session as unknown) as SessionWithUser).user.id
    console.log(`[pomodoro:start] userId=${userId} payloadType=${payload.type ?? "work"}`)
    const startAt = payload.startAt ? new Date(payload.startAt) : new Date()

    const created = await db.pomodoroSession.create({
      data: {
        userId,
        startAt,
        type: payload.type ?? "work",
      } as Prisma.PomodoroSessionUncheckedCreateInput,
    })

    res.status(201).json(created)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "invalid payload", details: err.issues })
    }
    console.error("[pomodoro] start error", err)
    res.status(500).json({ error: "failed to start session" })
  }
})

// POST /api/pomodoro/stop
router.post("/stop", async (req, res) => {
  try {
    const payload = StopSchema.parse(req.body)
    type SessionWithUser = { user: { id: string } }
    const userId = ((req.session as unknown) as SessionWithUser).user.id
    console.log(`[pomodoro:stop] userId=${userId} sessionId=${payload.sessionId}`)
    const session = await db.pomodoroSession.findFirst({ where: { id: payload.sessionId, userId } })
    if (!session) return res.status(404).json({ error: "session not found" })
    if (session.endAt) return res.status(400).json({ error: "session already stopped" })

    const endAt = payload.endAt ? new Date(payload.endAt) : new Date()
    const durationSeconds = Math.max(0, Math.floor((endAt.getTime() - session.startAt.getTime()) / 1000))

    const updated = await db.pomodoroSession.update({
      where: { id: session.id },
      data: { endAt, duration: durationSeconds } as Prisma.PomodoroSessionUncheckedUpdateInput,
    })

    // Update per-user aggregated minutes in UserStats (only count work sessions)
    try {
      const prevMinutes = Math.floor((session.duration ?? 0) / 60)
      const newMinutes = Math.floor((durationSeconds ?? 0) / 60)
      const deltaMinutes = Math.max(0, newMinutes - prevMinutes)

      if (deltaMinutes > 0 && (updated.type ?? "work") === "work") {
        await db.userStats.upsert({
          where: { userId },
          create: {
            userId,
            currentStreak: 0,
            bestStreak: 0,
            lastActive: null,
            totalPomodoroMinutes: deltaMinutes,
          },
          update: {
            totalPomodoroMinutes: { increment: deltaMinutes },
          },
        })
      }
    } catch (e) {
      console.error("failed to update UserStats minutes", e)
    }

    res.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "invalid payload", details: err.issues })
    }
    console.error("[pomodoro] stop error", err)
    res.status(500).json({ error: "failed to stop session" })
  }
})

// GET /api/pomodoro/sessions
router.get("/sessions", async (req, res) => {
  try {
    type SessionWithUser = { user: { id: string } }
    const userId = ((req.session as unknown) as SessionWithUser).user.id
    console.log(`[pomodoro:list] userId=${userId}`)
    const sessions = await db.pomodoroSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
    res.json(sessions)
  } catch (err) {
    console.error("[pomodoro] list error", err)
    res.status(500).json({ error: "failed to list sessions" })
  }
})

// GET /api/pomodoro/totals
router.get("/totals", async (req, res) => {
  try {
    type SessionWithUser = { user: { id: string } }
    const userId = ((req.session as unknown) as SessionWithUser).user.id
    console.log(`[pomodoro:totals] userId=${userId}`)
    const sessions = await db.pomodoroSession.findMany({ where: { userId, duration: { not: null } } })
    const MAX_SESSION_SECONDS = 6 * 3600
    let totalSeconds = 0

    

    const normalizeDuration = (s: PomodoroRecord) => {
      const raw = Math.max(0, s.duration ?? 0)
      if (raw <= MAX_SESSION_SECONDS) return raw
      // If value looks like milliseconds (raw/1000 fits), convert to seconds
      const asSeconds = Math.floor(raw / 1000)
      if (asSeconds <= MAX_SESSION_SECONDS) return asSeconds
      // otherwise cap
      return MAX_SESSION_SECONDS
    }

    for (const s of sessions as PomodoroRecord[]) {
      if (s.type && s.type !== "work") continue
      const dur = normalizeDuration(s)
      totalSeconds += dur
    }
    const totalMinutes = Math.floor(totalSeconds / 60)
    const totalHours = Math.floor(totalMinutes / 60)
    const remainingMinutes = totalMinutes % 60

    res.json({ totalSeconds, totalMinutes, totalHours, remainingMinutes })
    // persist authoritative totalMinutes to UserStats so frontend can read a user-specific stored value
    try {
      await db.userStats.upsert({
        where: { userId },
        create: {
          userId,
          currentStreak: 0,
          bestStreak: 0,
          lastActive: null,
          totalPomodoroMinutes: totalMinutes,
        },
        update: { totalPomodoroMinutes: totalMinutes },
      })
    } catch (e) {
      console.error("failed to persist totalPomodoroMinutes in /totals", e)
    }
  } catch (err) {
    console.error("[pomodoro] totals error", err)
    res.status(500).json({ error: "failed to compute totals" })
  }
})

// GET /api/pomodoro/totals/debug
// Returns per-session normalized contributions and reasons to help diagnose inflated totals
router.get("/totals/debug", async (req, res) => {
  try {
    type SessionWithUser = { user: { id: string } }
    const userId = ((req.session as unknown) as SessionWithUser).user.id
    const sessions = await db.pomodoroSession.findMany({ where: { userId }, orderBy: { startAt: "asc" } })
    const MAX_SESSION_SECONDS = 6 * 3600
    const now = new Date()

    const totalsDebugResults: TotalsDebugRow[] = []
    let totalSeconds = 0

    for (const s of sessions as PomodoroRecord[]) {
      const row: TotalsDebugRow = { id: s.id, type: s.type ?? null, startAt: s.startAt, endAt: s.endAt ?? null, durationRecorded: s.duration ?? null }
      if (s.type && s.type !== "work") {
        row.counted = false
        row.reason = "non-work"
        totalsDebugResults.push(row)
        continue
      }

      const start = new Date(s.startAt)
      if (start.getTime() > now.getTime() + 5 * 60 * 1000) {
        row.counted = false
        row.reason = "future-start"
        totalsDebugResults.push(row)
        continue
      }

      // Determine effective duration in seconds
      let contribution = 0
      let reason = ""

      if (s.endAt) {
        const end = new Date(s.endAt)
        if (end.getTime() <= start.getTime()) {
          row.counted = false
          row.reason = "end-before-start"
          totalsDebugResults.push(row)
          continue
        }
        contribution = Math.floor((end.getTime() - start.getTime()) / 1000)
        reason = "endAt-used"
      } else if (s.duration != null) {
        let raw = Math.max(0, s.duration ?? 0)
        if (raw > MAX_SESSION_SECONDS) {
          const maybeSeconds = Math.floor(raw / 1000)
          if (maybeSeconds <= MAX_SESSION_SECONDS) {
            raw = maybeSeconds
            reason = "converted-ms-to-s"
          } else {
            raw = MAX_SESSION_SECONDS
            reason = "capped-large-duration"
          }
        } else {
          reason = "duration-used"
        }
        const elapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000))
        if (raw > elapsed) {
          raw = elapsed
          reason = reason ? `${reason};capped-to-elapsed` : "capped-to-elapsed"
        }
        contribution = raw
      } else {
        // running session
        const elapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000))
        if (elapsed > 24 * 3600) {
          contribution = MAX_SESSION_SECONDS
          reason = "running-capped-24h"
        } else {
          contribution = elapsed
          reason = "running-now"
        }
      }

      // cap per-session contribution
      if (contribution > MAX_SESSION_SECONDS) {
        contribution = MAX_SESSION_SECONDS
        reason = reason ? `${reason};capped-max` : "capped-max"
      }

      row.counted = contribution > 0
      row.contributionSeconds = contribution
      row.reason = reason
      if (row.counted) totalSeconds += contribution
      totalsDebugResults.push(row)
    }

    const totalMinutes = Math.floor(totalSeconds / 60)
    const totalHours = Math.floor(totalMinutes / 60)
    res.json({ totalSeconds, totalMinutes, totalHours, sessions: totalsDebugResults })
  } catch (err) {
    console.error("[pomodoro] totals debug error", err)
    res.status(500).json({ error: "failed to compute totals debug" })
  }
})

// GET /api/pomodoro/stats
router.get("/stats", async (req, res) => {
  try {
    type SessionWithUser = { user: { id: string } }
    const userId = ((req.session as unknown) as SessionWithUser).user.id
    console.log(`[pomodoro:stats] userId=${userId}`)

    // Fetch all sessions (including active ones without `duration`) for this user
    const sessions = await db.pomodoroSession.findMany({ where: { userId }, orderBy: { startAt: "asc" } })
    // Per-session sanity cap to avoid inflated durations from bad data (6 hours)
    const MAX_SESSION_SECONDS = 6 * 3600

    // Read optional timezone offset (minutes) from query (user's local timezone)
    // If provided, stats and streaks will be computed relative to that timezone.
    // Example: pass `?tzOffsetMinutes=-330` for IST (UTC+5:30)
    const tzOffsetMinutes = typeof req.query.tzOffsetMinutes === "string" ? Number(req.query.tzOffsetMinutes) : undefined
    const offsetMs = typeof tzOffsetMinutes === "number" && !Number.isNaN(tzOffsetMinutes) ? tzOffsetMinutes * 60 * 1000 : 0

    // Helper: YYYY-MM-DD in the shifted timeline (applies offsetMs)
    const dayKey = (shiftedDayStartMs: number) => new Date(shiftedDayStartMs).toISOString().slice(0, 10)

    const dailyMap = new Map<string, number>()
    let totalSeconds = 0
    const now = new Date()
    // For accuracy, split each session's duration across UTC day boundaries so time is counted
    // toward the correct calendar day(s). Also ignore non-work sessions and sessions with
    // suspicious future start times.
    const normalizeDurationForStats = (s: PomodoroRecord, nowDate: Date) => {
      // Returns { start: Date, end: Date } representing the effective start/end (capped and converted)
      const startRaw = new Date(s.startAt)
      // ignore sessions that start far in the future (>5 minutes ahead)
      if (startRaw.getTime() > nowDate.getTime() + 5 * 60 * 1000) return null

      const sessionStart = startRaw

      let sessionEnd: Date
      if (s.endAt) {
        // Prefer explicit endAt when available (most authoritative)
        sessionEnd = new Date(s.endAt)
      } else if (s.duration != null) {
        // duration stored — may be seconds or accidentally milliseconds
        const raw = Math.max(0, s.duration ?? 0)
        let seconds = raw
        if (raw > MAX_SESSION_SECONDS) {
          const maybeSeconds = Math.floor(raw / 1000)
          if (maybeSeconds <= MAX_SESSION_SECONDS) seconds = maybeSeconds
          else seconds = MAX_SESSION_SECONDS
        }
        // Don't allow recorded duration to exceed elapsed time since start
        const elapsedSinceStart = Math.max(0, Math.floor((nowDate.getTime() - sessionStart.getTime()) / 1000))
        if (seconds > elapsedSinceStart) seconds = elapsedSinceStart
        sessionEnd = new Date(sessionStart.getTime() + seconds * 1000)
      } else {
        sessionEnd = nowDate
      }

      // guard: if sessionEnd is before sessionStart, skip
      if (sessionEnd.getTime() <= sessionStart.getTime()) return null

      // cap total session length to MAX_SESSION_SECONDS (in case endAt made a huge span)
      const rawLengthSec = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000)
      const cappedLengthSec = Math.min(rawLengthSec, MAX_SESSION_SECONDS)
      const effectiveEnd = new Date(sessionStart.getTime() + cappedLengthSec * 1000)
      return { sessionStart, effectiveEnd }
    }

    for (const s of sessions) {
      if (s.type && s.type !== "work") continue

      const normalized = normalizeDurationForStats(s, now)
      if (!normalized) continue
      const sessionStart = normalized.sessionStart
      const effectiveEnd = normalized.effectiveEnd

      // Walk each day in the user's local timezone (implemented by shifting times by offsetMs)
      // Compute shifted session start/end
      const shiftedStartMs = sessionStart.getTime() + offsetMs
      const shiftedEndMs = effectiveEnd.getTime() + offsetMs

      // cursorShift is UTC midnight of the shifted start's day (in shifted timeline)
      let cursorShift = Date.UTC(new Date(shiftedStartMs).getUTCFullYear(), new Date(shiftedStartMs).getUTCMonth(), new Date(shiftedStartMs).getUTCDate())
      const endDayShift = Date.UTC(new Date(shiftedEndMs).getUTCFullYear(), new Date(shiftedEndMs).getUTCMonth(), new Date(shiftedEndMs).getUTCDate())

      while (cursorShift <= endDayShift) {
        const dayStartShiftMs = cursorShift
        const dayEndShiftMs = cursorShift + 24 * 60 * 60 * 1000

        // Convert shifted day bounds back to real UTC ms by subtracting offsetMs
        const dayStartRealMs = dayStartShiftMs - offsetMs
        const dayEndRealMs = dayEndShiftMs - offsetMs

        const segStart = Math.max(sessionStart.getTime(), dayStartRealMs)
        const segEnd = Math.min(effectiveEnd.getTime(), dayEndRealMs)
        if (segEnd > segStart) {
          const add = Math.floor((segEnd - segStart) / 1000)
          const key = dayKey(dayStartShiftMs)
          const prev = dailyMap.get(key) ?? 0
          dailyMap.set(key, prev + add)
          totalSeconds += add
        }

        cursorShift += 24 * 60 * 60 * 1000
      }
    }

    // Build daily totals array (sorted ascending by date)
    const dailyTotals = Array.from(dailyMap.entries()).map(([date, seconds]) => ({ date, seconds }))

    // Compute streaks: consecutive days up to today in the user's local timeline
    // Require at least 2 minutes (120 seconds) of pomodoro use in a day to count toward a streak
    const MIN_ACTIVE_SECONDS = 120

    // Create a set of days with activity for quick lookup (only days with >= MIN_ACTIVE_SECONDS count)
    const activeDays = new Set(dailyTotals.filter((d) => d.seconds >= MIN_ACTIVE_SECONDS).map((d) => d.date))

    // current streak: count back from today (in shifted timeline) while day is active
    let currentStreak = 0
    const dayMs = 24 * 60 * 60 * 1000

    // shiftedNowMs is the current instant shifted by offsetMs into the user's local timeline
    const shiftedNowMs = now.getTime() + offsetMs
    let cursorShift = Date.UTC(new Date(shiftedNowMs).getUTCFullYear(), new Date(shiftedNowMs).getUTCMonth(), new Date(shiftedNowMs).getUTCDate())
    while (true) {
      const key = dayKey(cursorShift)
      if (activeDays.has(key)) {
        currentStreak++
        cursorShift -= dayMs
      } else {
        break
      }
    }

    // longest streak: iterate sorted days and count longest consecutive run
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

    const totalMinutes = Math.floor(totalSeconds / 60)
    const totalHours = Math.floor(totalMinutes / 60)
    res.json({ totalSeconds, totalMinutes, totalHours, dailyTotals, currentStreak, longestStreak })
    // persist authoritative totalMinutes to UserStats so frontend can read a user-specific stored value
    try {
      await db.userStats.upsert({
        where: { userId },
        create: {
          userId,
          currentStreak: currentStreak ?? 0,
          bestStreak: longestStreak ?? 0,
          lastActive: null,
          totalPomodoroMinutes: totalMinutes,
        },
        update: { totalPomodoroMinutes: totalMinutes },
      })
    } catch (e) {
      console.error("failed to persist totalPomodoroMinutes in /stats", e)
    }
  } catch (err) {
    console.error("[pomodoro] stats error", err)
    res.status(500).json({ error: "failed to compute stats" })
  }
})

export default router

// Diagnostic route (returns suspicious sessions for current user)
// Use this to inspect sessions that may be inflating totals (long durations, future starts, running very long).
router.get("/diagnostics", async (req, res) => {
  try {
    type SessionWithUser = { user: { id: string } }
    const userId = ((req.session as unknown) as SessionWithUser).user.id
    const now = new Date()
    const MAX_SESSION_SECONDS = 6 * 3600

    const sessions = await db.pomodoroSession.findMany({ where: { userId }, orderBy: { startAt: "asc" } })

    const diagnosticsResults: DiagnosticsRow[] = (sessions as PomodoroRecord[]).map((s) => {
      const start = new Date(s.startAt)
      const durationRecorded = s.duration != null ? s.duration : null
      const computedDuration = durationRecorded != null ? durationRecorded : Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000))
      const futureStart = start.getTime() > now.getTime() + 5 * 60 * 1000
      const tooLong = computedDuration > MAX_SESSION_SECONDS
      const runningTooLong = s.duration == null && computedDuration > 24 * 3600 // running more than 24h
      return {
        id: s.id,
        type: s.type ?? null,
        startAt: s.startAt,
        endAt: s.endAt ?? null,
        durationRecorded,
        computedDuration,
        futureStart,
        tooLong,
        runningTooLong,
        createdAt: s.createdAt ?? null,
      }
    })

    // Filter only suspicious ones but include a sample of normal sessions for context
    const suspicious = diagnosticsResults.filter((r) => r.futureStart || r.tooLong || r.runningTooLong)
    const sample = diagnosticsResults.slice(-20)

    res.json({ suspicious, sampleCount: sample.length, sample })
  } catch (err) {
    console.error("[pomodoro] diagnostics error", err)
    res.status(500).json({ error: "failed to compute diagnostics" })
  }
})

// POST /api/pomodoro/cleanup?apply=true
// Scans user's sessions for suspicious records and returns proposed fixes.
// If `apply=true` query param is provided, the fixes are applied.
router.post("/cleanup", async (req, res) => {
  try {
    type SessionWithUser = { user: { id: string } }
    const userId = ((req.session as unknown) as SessionWithUser).user.id
    const now = new Date()
    const MAX_SESSION_SECONDS = 6 * 3600

    const sessions = await db.pomodoroSession.findMany({ where: { userId }, orderBy: { startAt: "asc" } })

    const fixes: Fix[] = []

    for (const s of sessions) {
      let updated: FixChange | null = null
      const start = new Date(s.startAt)
      const durationRecorded = s.duration

      // ignore non-work
      if (s.type && s.type !== "work") continue

      // ignore sessions that start far in the future
      if (start.getTime() > now.getTime() + 5 * 60 * 1000) continue

      // If duration is present but extremely large, detect ms vs seconds
      if (durationRecorded != null) {
        if (durationRecorded > MAX_SESSION_SECONDS) {
          // If dividing by 1000 makes it reasonable, we assume ms were saved instead of seconds
          if (Math.floor(durationRecorded / 1000) <= MAX_SESSION_SECONDS) {
            const corrected = Math.floor(durationRecorded / 1000)
            updated = { duration: corrected, endAt: new Date(start.getTime() + corrected * 1000) }
            fixes.push({ id: s.id, reason: "duration-milliseconds-detected", before: { duration: durationRecorded }, after: updated })
          } else {
            // otherwise cap to MAX_SESSION_SECONDS
            const corrected = MAX_SESSION_SECONDS
            updated = { duration: corrected, endAt: new Date(start.getTime() + corrected * 1000) }
            fixes.push({ id: s.id, reason: "duration-too-large-capped", before: { duration: durationRecorded }, after: updated })
          }
        }
      } else {
        // running session: if started a very long time ago (>24h), cap and stop it
        const runningSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000))
        if (runningSeconds > 24 * 3600) {
          const corrected = MAX_SESSION_SECONDS
          updated = { duration: corrected, endAt: new Date(start.getTime() + corrected * 1000) }
          fixes.push({ id: s.id, reason: "running-too-long-capped", before: { startAt: s.startAt }, after: updated })
        }
      }

      // apply update if requested
      if (updated) {
        // do not apply yet; we'll apply in a second pass
      }
    }

    const apply = String(req.query.apply || "false").toLowerCase() === "true"
    const applied: Array<{ id: string; updated: unknown }> = []
    if (apply && fixes.length > 0) {
      for (const f of fixes) {
        const upd = await db.pomodoroSession.update({ where: { id: f.id }, data: f.after as Prisma.PomodoroSessionUncheckedUpdateInput })
        applied.push({ id: f.id, updated: upd })
      }
    }

    res.json({ count: fixes.length, fixes, applied: applied.length, appliedDetails: applied })
  } catch (err) {
    console.error("[pomodoro] cleanup error", err)
    res.status(500).json({ error: "failed to run cleanup" })
  }
})
