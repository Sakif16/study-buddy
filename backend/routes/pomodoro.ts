import express from "express"
import { z } from "zod"
import { db } from "../db.js"
import type { Prisma } from "../generated/prisma/client.js"

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
    const totalSeconds = sessions.reduce((acc, s) => acc + (s.duration ?? 0), 0)
    const totalHours = Math.floor(totalSeconds / 3600)
    const remainingMinutes = Math.floor((totalSeconds % 3600) / 60)

    res.json({ totalSeconds, totalHours, remainingMinutes })
  } catch (err) {
    console.error("[pomodoro] totals error", err)
    res.status(500).json({ error: "failed to compute totals" })
  }
})

// GET /api/pomodoro/stats
router.get("/stats", async (req, res) => {
  try {
    type SessionWithUser = { user: { id: string } }
    const userId = ((req.session as unknown) as SessionWithUser).user.id
    console.log(`[pomodoro:stats] userId=${userId}`)

    const sessions = await db.pomodoroSession.findMany({
      where: { userId, duration: { not: null } },
      orderBy: { startAt: "asc" },
    })

    // Helper: YYYY-MM-DD in UTC
    const dayKey = (d: Date) => d.toISOString().slice(0, 10)

    const dailyMap = new Map<string, number>()
    let totalSeconds = 0
    for (const s of sessions) {
      const key = dayKey(new Date(s.startAt))
      const prev = dailyMap.get(key) ?? 0
      const add = s.duration ?? 0
      dailyMap.set(key, prev + add)
      totalSeconds += add
    }

    // Build daily totals array (sorted ascending by date)
    const dailyTotals = Array.from(dailyMap.entries()).map(([date, seconds]) => ({ date, seconds }))

    // Compute streaks: consecutive days up to today (UTC) where seconds > 0
    const todayKey = new Date().toISOString().slice(0, 10)

    // Create a set of days with activity for quick lookup
    const activeDays = new Set(dailyTotals.filter((d) => d.seconds > 0).map((d) => d.date))

    // current streak: count back from today while day is active
    let currentStreak = 0
    const dayMs = 24 * 60 * 60 * 1000
    let cursor = new Date(new Date().toISOString().slice(0, 10)) // UTC midnight today
    while (true) {
      const key = cursor.toISOString().slice(0, 10)
      if (activeDays.has(key)) {
        currentStreak++
        cursor = new Date(cursor.getTime() - dayMs)
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

    const totalHours = Math.floor(totalSeconds / 3600)
    res.json({ totalSeconds, totalHours, dailyTotals, currentStreak, longestStreak })
  } catch (err) {
    console.error("[pomodoro] stats error", err)
    res.status(500).json({ error: "failed to compute stats" })
  }
})

export default router
