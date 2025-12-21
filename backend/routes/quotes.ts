import express from "express"
import { z } from "zod"
import { db } from "../db.js"

const router = express.Router()

// GET /api/quotes?skip=0&limit=20
router.get("/", async (req, res) => {
  try {
    const QuerySchema = z.object({
      skip: z.string().optional(),
      limit: z.string().optional(),
    })
    const q = QuerySchema.parse(req.query)
    const skip = q.skip ? parseInt(q.skip, 10) || 0 : 0
    const limit = q.limit ? Math.min(100, Math.max(1, parseInt(q.limit, 10) || 20)) : 20

    const quotes = await db.quote.findMany({ orderBy: { createdAt: "desc" }, skip, take: limit })
    res.json(quotes)
  } catch (err) {
    console.error("[quotes] list error", err)
    res.status(500).json({ error: "failed to list quotes" })
  }
})

// GET /api/quotes/random
router.get("/random", async (req, res) => {
  try {
    const quotes = await db.quote.findMany()
    if (quotes.length === 0) return res.status(404).json({ error: "no quotes" })
    const picked = quotes[Math.floor(Math.random() * quotes.length)]
    res.json(picked)
  } catch (err) {
    console.error("[quotes] random error", err)
    res.status(500).json({ error: "failed to get random quote" })
  }
})

// GET /api/quotes/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const quote = await db.quote.findUnique({ where: { id } })
    if (!quote) return res.status(404).json({ error: "not found" })
    res.json(quote)
  } catch (err) {
    console.error("[quotes] get error", err)
    res.status(500).json({ error: "failed to get quote" })
  }
})

// Create quote (require auth)
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.session?.user) return res.status(401).json({ error: "unauthorized" })
  next()
}

const CreateSchema = z.object({
  text: z.string().min(1),
  author: z.string().optional(),
})

router.post("/", requireAuth, async (req, res) => {
  try {
    const payload = CreateSchema.parse(req.body)
    const created = await db.quote.create({ data: { text: payload.text, author: payload.author ?? null } })
    res.status(201).json(created)
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "invalid payload", details: err.issues })
    console.error("[quotes] create error", err)
    res.status(500).json({ error: "failed to create quote" })
  }
})

export default router
