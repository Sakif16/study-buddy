import express from "express"
import { z } from "zod"
import { db } from "../db.js"
import { Prisma } from "../generated/prisma/client.js"
import multer from "multer"
import fs from "node:fs"
import path from "node:path"

const router = express.Router()

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session?.user) return res.status(401).json({ error: "unauthorized" })
    next()
}

router.use(requireAuth)

// multer instance configured per-route so we can use note id in destination
const makeUploader = () =>
    multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                try {
                    const noteId = req.params.id
                    const dest = path.join(import.meta.dirname, "uploads", noteId)
                    fs.mkdirSync(dest, { recursive: true })
                    cb(null, dest)
                } catch (err) {
                    cb(err as any)
                }
            },
            filename: (req, file, cb) => {
                const safe = file.originalname.replace(/\s+/g, "_")
                cb(null, `${Date.now()}-${safe}`)
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
    })

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

        const mapped = notes.map((n) => {
            const base = { ...n, isFavorite: (n as any).isFavorite ?? false }
            try {
                const dir = path.join(import.meta.dirname, "uploads", n.id)
                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir)
                    const attachments = files.map((f) => ({
                        filename: f,
                        url: `/api/notes/${n.id}/attachments/${encodeURIComponent(f)}`,
                    }))
                    return { ...base, attachments }
                }
            } catch (err) {
                // ignore filesystem errors
            }
            return { ...base, attachments: [] }
        })
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

        res.status(201).json({ ...created, isFavorite: (created as any).isFavorite ?? false, attachments: [] })
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

        // include attachments info from disk
        const dir = path.join(import.meta.dirname, "uploads", updated.id)
        let attachments = []
        try {
            if (fs.existsSync(dir)) attachments = fs.readdirSync(dir).map((f) => ({ filename: f, url: `/api/notes/${updated.id}/attachments/${encodeURIComponent(f)}` }))
        } catch (err) { }

        res.json({ ...updated, isFavorite: (updated as any).isFavorite ?? false, attachments })
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
        // remove files from disk if present
        try {
            const dir = path.join(import.meta.dirname, "uploads", note.id)
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true })
            }
        } catch (err) {
            console.error("failed to remove attachments", err)
        }
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

// POST /api/notes/:id/attachments  - upload attachments for a note
router.post("/:id/attachments", async (req, res, next) => {
    const uploader = makeUploader()
    return uploader.array("files", 10)(req, res, async (err?: any) => {
        if (err) return res.status(400).json({ error: err.message || "upload failed" })
        try {
            const userId = req.session!.user.id
            const note = await db.note.findFirst({ where: { id: req.params.id, userId } })
            if (!note) return res.status(404).json({ error: "not found" })

            const files = (req.files || []) as Express.Multer.File[]
            const metadata = files.map((f) => ({ originalName: f.originalname, filename: f.filename, size: f.size, mime: f.mimetype, url: `/api/notes/${req.params.id}/attachments/${encodeURIComponent(f.filename)}` }))
            res.status(201).json({ attachments: metadata })
        } catch (err) {
            console.error("[notes] upload attachments error", err)
            res.status(500).json({ error: "failed to upload attachments" })
        }
    })
})

export default router

// GET /api/notes/:id/attachments/:filename - serve attachment file (requires auth)
router.get('/:id/attachments/:filename', async (req, res) => {
    try {
        const userId = req.session!.user.id
        const note = await db.note.findFirst({ where: { id: req.params.id, userId } })
        if (!note) return res.status(404).json({ error: 'not found' })

        const rawFilename = req.params.filename
        const filename = decodeURIComponent(rawFilename)

        // prevent path traversal
        if (filename.includes('..') || path.isAbsolute(filename)) return res.status(400).json({ error: 'invalid filename' })

        const candidates = [
            path.join(import.meta.dirname, 'uploads', req.params.id, filename),
            path.join(import.meta.dirname, '..', 'uploads', req.params.id, filename),
            path.join(import.meta.dirname, 'routes', 'uploads', req.params.id, filename),
            path.join(process.cwd(), 'uploads', req.params.id, filename),
            path.join(process.cwd(), 'backend', 'uploads', req.params.id, filename),
        ]

        let filePath: string | null = null
        for (const p of candidates) {
            if (fs.existsSync(p)) {
                filePath = p
                break
            }
        }
        if (!filePath) {
            console.error('[notes] attachment not found, checked paths:', candidates)
            return res.status(404).json({ error: 'file not found' })
        }
        console.log('[notes] serving attachment from', filePath)

        const ext = path.extname(filename).toLowerCase()
        const inlineTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf']
        if (inlineTypes.includes(ext)) {
            res.setHeader('Content-Disposition', 'inline')
        } else {
            res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`)
        }
        // set Content-Type explicitly
        try {
            res.type(ext)
        } catch (e) { }
        // allow caching for attachments
        res.setHeader('Cache-Control', 'public, max-age=86400')

        return res.sendFile(filePath)
    } catch (err) {
        console.error('[notes] serve attachment error', err)
        return res.status(500).json({ error: 'failed to serve attachment' })
    }
})
