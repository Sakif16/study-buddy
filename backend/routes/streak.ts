import express from "express"
import { db } from "../db.js"

const router = express.Router()

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: "unauthorized" })
  }
  next()
}

router.use(requireAuth)

// GET /api/streak/
router.get("/", async (req, res) => {
  try {
    type SessionWithUser = { user: { id: string } }
    const userId = ((req.session as unknown) as SessionWithUser).user.id

    const stats = await db.userStats.findUnique({ where: { userId } })
    // compute authoritative completed tasks count from tasks collection
    let actualCompleted = 0
    try {
      actualCompleted = await db.task.count({ where: { userId, completed: true } })
    } catch (e) {
      console.error("failed to count completed tasks for streak response", e)
    }

    // if stats missing, return zeros but include actual completed count
    if (!stats) {
      return res.json({ currentStreak: 0, bestStreak: 0, completedTasks: actualCompleted, totalPomodoroMinutes: 0, lastActive: null })
    }

    // do not update stored value here; return authoritative completedTasks

    return res.json({
      currentStreak: stats.currentStreak ?? 0,
      bestStreak: stats.bestStreak ?? 0,
      completedTasks: actualCompleted,
      totalPomodoroMinutes: stats.totalPomodoroMinutes ?? 0,
      lastActive: stats.lastActive ?? null,
    })
  } catch (e) {
    console.error("/api/streak error", e)
    return res.status(500).json({ error: "failed to fetch streak" })
  }
})

export default router
