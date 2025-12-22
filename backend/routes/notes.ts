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

const NoteSchema = z.object({
    title: z.string().min(1),
    content: z.string().optional().nullable(),
    category: z.string().optional(),
})

// GET /api/notes
router.get("/", async (req, res) => {
    try {
        const userId = req.session!.user.id
        const notes = await db.note.findMany({ where: { userId }, orderBy: { createdAt: "desc" } })

        // Include `isFavorite` from DB (default false if not present)
        const mapped = notes.map((n) => ({ ...n, isFavorite: (n as any).isFavorite ?? false }))
        res.json(mapped)
    } catch (err) {
        console.error("[notes] list error", err)
        res.status(500).json({ error: "failed to list notes" })
    }
})

// POST /api/notes
router.post("/", async (req, res) => {
    try {
        const payload = NoteSchema.parse(req.body)
        const userId = req.session!.user.id
        const created = await db.note.create({ data: { ...payload, userId } as Prisma.NoteCreateInput })

        // include `isFavorite` from DB (default false)
        res.status(201).json({ ...created, isFavorite: (created as any).isFavorite ?? false })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: "invalid payload", details: err.errors })
        }
        console.error("[notes] create error", err)
        res.status(500).json({ error: "failed to create note" })
    }
})

// PUT /api/notes/:id
router.put("/:id", async (req, res) => {
    try {
        const userId = req.session!.user.id
        const note = await db.note.findFirst({ where: { id: req.params.id, userId } })
        if (!note) return res.status(404).json({ error: "not found" })

        const payload = NoteSchema.partial().parse(req.body)
        const updated = await db.note.update({ where: { id: req.params.id }, data: payload as Prisma.NoteUpdateInput })

        res.json({ ...updated, isFavorite: (updated as any).isFavorite ?? false })
    } catch (err) {
        console.error("[notes] update error", err)
        res.status(400).json({ error: "failed to update note" })
    }
})

// DELETE /api/notes/:id
router.delete("/:id", async (req, res) => {
    try {
        const userId = req.session!.user.id
        const note = await db.note.findFirst({ where: { id: req.params.id, userId } })
        if (!note) return res.status(404).json({ error: "not found" })

        await db.note.delete({ where: { id: note.id } })
        res.sendStatus(204)
    } catch (err) {
        console.error("[notes] delete error", err)
        res.status(400).json({ error: "failed to delete" })
    }
})

// PATCH /api/notes/:id/favorite  -- set/unset favorite in session
router.patch("/:id/favorite", async (req, res) => {
    try {
        const userId = req.session!.user.id
        const note = await db.note.findFirst({ where: { id: req.params.id, userId } })
        if (!note) return res.status(404).json({ error: "not found" })

        const body = typeof req.body === "object" ? req.body : {}
        const isFav = !!body.isFavorite

        const updated = await db.note.update({ where: { id: note.id }, data: { isFavorite: isFav } as Prisma.NoteUpdateInput })
        res.json({ id: updated.id, isFavorite: (updated as any).isFavorite ?? false })
    } catch (err) {
        console.error("[notes] favorite toggle error", err)
        res.status(400).json({ error: "failed to update favorite" })
    }
})

export default router
