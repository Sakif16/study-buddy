import express from "express"
import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"
import { z } from "zod"
import { db } from "../db.js"
import type { Prisma } from "../generated/prisma/client.js"

const router = express.Router()

const requireAuth = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!req.session?.user) return res.status(401).json({ error: "unauthorized" })
  next()
}

router.use(requireAuth)

// storage directories
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, "..", "public", "uploads")
const versionsRoot = path.join(__dirname, "..", "data", "note-versions")
try {
  fs.mkdirSync(uploadsDir, { recursive: true })
  fs.mkdirSync(versionsRoot, { recursive: true })
} catch (e) {
  console.error("failed to ensure dirs", e)
}

function listAttachmentsForNote(noteId: string) {
  try {
    const dir = path.join(uploadsDir, noteId)
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir).filter((f) => !f.startsWith(".")).map((f) => ({ name: f, url: `/public/uploads/${encodeURIComponent(noteId)}/${encodeURIComponent(f)}` }))
  } catch (e) {
    console.error('listAttachmentsForNote error', e)
    return []
  }
}

function getVersionsDir(noteId: string) {
  return path.join(versionsRoot, noteId)
}

function saveNoteVersion(note: any) {
  try {
    const dir = getVersionsDir(note.id)
    fs.mkdirSync(dir, { recursive: true })
    const ts = Date.now().toString()
    const payload = {
      id: ts,
      noteId: note.id,
      title: note.title,
      content: note.content ?? null,
      category: note.category ?? null,
      userId: note.userId,
      createdAt: new Date().toISOString(),
    }
    const filename = path.join(dir, `${ts}.json`)
    fs.writeFileSync(filename, JSON.stringify(payload, null, 2), "utf-8")
    return payload
  } catch (e) {
    console.error("failed to save note version", e)
    return null
  }
}

function listNoteVersions(noteId: string) {
  try {
    const dir = getVersionsDir(noteId)
    if (!fs.existsSync(dir)) return []
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"))
    const versions = files.map(f => {
      try {
        const raw = fs.readFileSync(path.join(dir, f), "utf-8")
        const json = JSON.parse(raw)
        return json
      } catch (e) { return null }
    }).filter(Boolean)
    // sort desc
    versions.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return versions
  } catch (e) {
    console.error("listNoteVersions error", e)
    return []
  }
}

function readNoteVersion(noteId: string, vid: string) {
  try {
    const file = path.join(getVersionsDir(noteId), `${vid}.json`)
    if (!fs.existsSync(file)) return null
    const raw = fs.readFileSync(file, "utf-8")
    return JSON.parse(raw)
  } catch (e) {
    console.error('readNoteVersion error', e)
    return null
  }
}

const NoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional().nullable(),
  category: z.string().optional(),
})

// GET /api/notes
router.get("/", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const notes = await db.note.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    const mapped = notes.map((n) => ({
      ...n,
      isFavorite: (n as any).isFavorite ?? false,
      attachments: listAttachmentsForNote(n.id),
    }))
    res.json(mapped)
  } catch (err) {
    console.error("[notes] list error", err)
    res.status(500).json({ error: "failed to list notes" })
  }
})

// POST /api/notes
router.post("/", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const payload = NoteSchema.parse(req.body)
    const userId = req.session!.user.id
    const created = await db.note.create({
      data: { ...payload, userId } as any,
    })

    res
      .status(201)
      .json({ ...created, isFavorite: (created as any).isFavorite ?? false, attachments: [] })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "invalid payload", details: z.flattenError(err) })
    }
    console.error("[notes] create error", err)
    res.status(500).json({ error: "failed to create note" })
  }
})

// PUT /api/notes/:id
router.put("/:id", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const note = await db.note.findFirst({
      where: { id: req.params.id, userId },
    })
    if (!note) return res.status(404).json({ error: "not found" })

    // save previous version to disk
    try {
      saveNoteVersion(note)
    } catch (e) {
      console.error('failed to persist previous note version', e)
    }

    const payload = NoteSchema.partial().parse(req.body)
    const updated = await db.note.update({
      where: { id: req.params.id },
      data: payload as Prisma.NoteUpdateInput,
    })

    res.json({
      ...updated,
      isFavorite: (updated as any).isFavorite ?? false,
      attachments: listAttachmentsForNote(updated.id),
    })
  } catch (err) {
    console.error("[notes] update error", err)
    res.status(400).json({ error: "failed to update note" })
  }
})

// versions: list, get, restore

// GET /api/notes/:id/versions
router.get("/:id/versions", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const note = await db.note.findFirst({ where: { id: req.params.id, userId } })
    if (!note) return res.status(404).json({ error: "not found" })
    const versions = listNoteVersions(note.id)
    res.json(versions)
  } catch (e) {
    console.error("[notes] list versions error", e)
    res.status(500).json({ error: "failed to list versions" })
  }
})

// GET /api/notes/:id/versions/:vid
router.get("/:id/versions/:vid", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const note = await db.note.findFirst({ where: { id: req.params.id, userId } })
    if (!note) return res.status(404).json({ error: "not found" })
    const v = readNoteVersion(note.id, req.params.vid)
    if (!v) return res.status(404).json({ error: "version not found" })
    res.json(v)
  } catch (e) {
    console.error("[notes] get version error", e)
    res.status(500).json({ error: "failed to get version" })
  }
})

// POST /api/notes/:id/versions/:vid/restore
router.post("/:id/versions/:vid/restore", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const note = await db.note.findFirst({ where: { id: req.params.id, userId } })
    if (!note) return res.status(404).json({ error: "not found" })
    const v = readNoteVersion(note.id, req.params.vid)
    if (!v) return res.status(404).json({ error: "version not found" })

    // Save current as version before restoring
    try { saveNoteVersion(note) } catch (e) { console.error('failed to save current before restore', e) }

    const updated = await db.note.update({
      where: { id: note.id },
      data: {
        title: v.title ?? note.title,
        content: v.content ?? null,
        category: v.category ?? note.category,
      } as Prisma.NoteUpdateInput,
    })

    res.json({
      ...updated,
      isFavorite: (updated as any).isFavorite ?? false,
      attachments: listAttachmentsForNote(updated.id),
    })
  } catch (e) {
    console.error("[notes] restore version error", e)
    res.status(500).json({ error: "failed to restore version" })
  }
})

// POST /api/notes/:id/attachments  - upload attachments for an existing note
router.post("/:id/attachments", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const note = await db.note.findFirst({ where: { id: req.params.id, userId } })
    if (!note) return res.status(404).json({ error: "not found" })

    // dynamically import multer so server can run if multer isn't installed
    let multerPkg: any
    try {
      // @ts-ignore
      multerPkg = await import('multer')
    } catch (e) {
      return res.status(501).json({ error: 'multer-not-installed', message: 'File upload support is not available. Please install multer in the backend.' })
    }
    const multer = multerPkg.default ?? multerPkg

    const noteDir = path.join(uploadsDir, note.id)
    try { fs.mkdirSync(noteDir, { recursive: true }) } catch (e) { console.error('failed to ensure note upload dir', e) }

    const storage = multer.diskStorage({
      destination: (req: express.Request, file: any, cb: (err: Error | null, dest: string) => void) => cb(null, noteDir),
      filename: (req: express.Request, file: any, cb: (err: Error | null, filename: string) => void) => {
        const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`
        cb(null, safe)
      },
    })

    const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

    upload.array('attachments', 10)(req as any, res as any, (err: any) => {
      try {
        if (err) {
          console.error('/api/notes/:id/attachments upload middleware error', err)
          return res.status(400).json({ error: 'upload_failed', details: String(err) })
        }
        const files = (req as any).files || []
        const list = files.map((f: any) => ({ name: f.filename, url: `/public/uploads/${encodeURIComponent(note.id)}/${encodeURIComponent(f.filename)}` }))
        return res.status(201).json({ uploaded: list })
      } catch (e) {
        console.error('/api/notes attachments error', e)
        return res.status(500).json({ error: 'failed to upload files' })
      }
    })
  } catch (err) {
    console.error('[notes] attachments error', err)
    res.status(400).json({ error: 'failed to upload attachments' })
  }
})

// DELETE /api/notes/:id
router.delete("/:id", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const note = await db.note.findFirst({
      where: { id: req.params.id, userId },
    })
    if (!note) return res.status(404).json({ error: "not found" })

    await db.note.delete({ where: { id: note.id } })
    // remove attachments folder if present
    try {
      const dir = path.join(uploadsDir, note.id)
      if (fs.existsSync(dir)) {
        if ((fs as any).rmSync) {
          (fs as any).rmSync(dir, { recursive: true, force: true })
        } else {
          fs.rmdirSync(dir, { recursive: true })
        }
      }
    } catch (e) {
      console.error('failed to remove note attachments', e)
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
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const note = await db.note.findFirst({
      where: { id: req.params.id, userId },
    })
    if (!note) return res.status(404).json({ error: "not found" })

    const body = typeof req.body === "object" ? req.body : {}
    const isFav = !!body.isFavorite

    const updated = await db.note.update({
      where: { id: note.id },
      data: { isFavorite: isFav } as Prisma.NoteUpdateInput,
    })
    res.json({
      id: updated.id,
      isFavorite: (updated as any).isFavorite ?? false,
    })
  } catch (err) {
    console.error("[notes] favorite toggle error", err)
    res.status(400).json({ error: "failed to update favorite" })
  }
})

export default router