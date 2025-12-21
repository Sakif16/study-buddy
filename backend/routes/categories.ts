import express from "express"
import { z } from "zod"
import { db } from "../db.js"
import { Prisma } from "../generated/prisma/client.js"

const router = express.Router()

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session?.user) return res.status(401).json({ error: "unauthorized" })
    next()
}

router.use(requireAuth)

const CategorySchema = z.object({
    name: z.string().min(1),
    color: z.string().min(1),
})

// GET /api/categories
router.get("/", async (req, res) => {
    try {
        const userId = req.session!.user.id
        const cats = await db.category.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })
        res.json(cats)
    } catch (err) {
        console.error("[categories] list error", err)
        res.status(500).json({ error: "failed to list categories" })
    }
})

// POST /api/categories
router.post("/", async (req, res) => {
    try {
        const payload = CategorySchema.parse(req.body)
        const userId = req.session!.user.id
        const created = await db.category.create({ data: { ...payload, userId } as Prisma.CategoryCreateInput })
        res.status(201).json(created)
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: "invalid payload", details: err.errors })
        console.error("[categories] create error", err)
        res.status(500).json({ error: "failed to create category" })
    }
})

// PUT /api/categories/:id
router.put("/:id", async (req, res) => {
    try {
        const userId = req.session!.user.id
        const cat = await db.category.findFirst({ where: { id: req.params.id, userId } })
        if (!cat) return res.status(404).json({ error: "not found" })

        const payload = CategorySchema.partial().parse(req.body)
        const updated = await db.category.update({ where: { id: req.params.id }, data: payload as Prisma.CategoryUpdateInput })
        res.json(updated)
    } catch (err) {
        console.error("[categories] update error", err)
        res.status(400).json({ error: "failed to update category" })
    }
})

// DELETE /api/categories/:id
router.delete("/:id", async (req, res) => {
    try {
        const userId = req.session!.user.id
        const cat = await db.category.findFirst({ where: { id: req.params.id, userId } })
        if (!cat) return res.status(404).json({ error: "not found" })

        await db.category.delete({ where: { id: cat.id } })
        res.sendStatus(204)
    } catch (err) {
        console.error("[categories] delete error", err)
        res.status(400).json({ error: "failed to delete category" })
    }
})

export default router
