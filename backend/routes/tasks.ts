import express from "express"
import { z } from "zod"
import { db } from "../db.js"
/* eslint-disable */

const router = express.Router()

// Middleware to ensure user is authenticated
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: "unauthorized" })
  }
  next()
}

router.use(requireAuth)

const TaskSchema = z.object({
  title: z.string().optional(),
  notes: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  dueTime: z.string().optional().nullable(),
  completed: z.boolean().optional(),
})

// GET /api/tasks
router.get("/", async (req, res) => {
  try {
    const user = req.session?.user
    if (!user) return res.status(401).json({ error: "unauthorized" })
    const userId = user.id
    const tasks = await db.task.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })
    res.json(tasks)
  } catch (err) {
    console.error("[tasks] list error", err)
    res.status(500).json({ error: "failed to list tasks" })
  }
})

// POST /api/tasks
router.post("/", async (req, res) => {
  try {
    const payload = TaskSchema.parse(req.body)
    const user = req.session?.user
    if (!user) return res.status(401).json({ error: "unauthorized" })
    const userId = user.id
    const createData = {
      userId,
      title: payload.title ?? null,
      notes: payload.notes ?? null,
      dueDate: payload.dueDate ?? null,
      dueTime: payload.dueTime ?? null,
      completed: typeof payload.completed === "boolean" ? payload.completed : false,
    }
    const created = await db.task.create({ data: createData })
    // Note: completedTasks syncing is handled on login/streak fetch to avoid schema/type mismatch here.
    res.status(201).json(created)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: "invalid payload",
        details: err.issues,
      })
    }
    console.error("[tasks] create error", err)
    res.status(500).json({ error: "failed to create task" })
  }
})

// PUT /api/tasks/:id
router.put("/:id", async (req, res) => {
  try {
    const user = req.session?.user
    if (!user) return res.status(401).json({ error: "unauthorized" })
    const userId = user.id
    const task = await db.task.findFirst({ where: { id: req.params.id, userId } })
    if (!task) return res.status(404).json({ error: "not found" })

    const payload = TaskSchema.partial().parse(req.body)
    const updateData: Record<string, unknown> = {}
    if (Object.hasOwn(payload, "title")) updateData.title = payload.title ?? null
    if (Object.hasOwn(payload, "notes")) updateData.notes = payload.notes ?? null
    if (Object.hasOwn(payload, "dueDate")) updateData.dueDate = payload.dueDate ?? null
    if (Object.hasOwn(payload, "dueTime")) updateData.dueTime = payload.dueTime ?? null
    if (Object.hasOwn(payload, "completed")) updateData.completed = payload.completed
    const updated = await db.task.update({ where: { id: req.params.id }, data: updateData })
    // Note: completedTasks syncing is handled on login/streak fetch to avoid schema/type mismatch here.
    res.json(updated)
  } catch (err) {
    console.error("[tasks] update error", err)
    res.status(400).json({ error: "failed to update task" })
  }
})

// PATCH /api/tasks/:id/toggle
router.patch("/:id/toggle", async (req, res) => {
  try {
    const user = req.session?.user
    if (!user) return res.status(401).json({ error: "unauthorized" })
    const userId = user.id
    const task = await db.task.findFirst({ where: { id: req.params.id, userId } })
    if (!task) return res.status(404).json({ error: "not found" })

    const updated = await db.task.update({
      where: { id: req.params.id },
      data: { completed: !task.completed },
    })
    // Note: completedTasks syncing is handled on login/streak fetch to avoid schema/type mismatch here.
    res.json(updated)
  } catch (err) {
    console.error("[tasks] toggle error", err)
    res.status(500).json({ error: "failed to toggle" })
  }
})

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  try {
    const user = req.session?.user
    if (!user) return res.status(401).json({ error: "unauthorized" })
    const userId = user.id
    const task = await db.task.findFirst({ where: { id: req.params.id, userId } })
    if (!task) return res.status(404).json({ error: "not found" })

    await db.task.delete({ where: { id: task.id } })
    // Note: completedTasks syncing is handled on login/streak fetch to avoid schema/type mismatch here.
    res.sendStatus(204)
  } catch (err) {
    console.error("[tasks] delete error", err)
    res.status(400).json({ error: "failed to delete" })
  }
})

export default router
