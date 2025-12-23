import express from "express"
import path from "node:path"
import fs from "node:fs"
import { z } from "zod"
import { fileURLToPath } from "node:url"

const router = express.Router()

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session?.user) return res.status(401).json({ error: "unauthorized" })
    next()
}

router.use(requireAuth)

// storage directory: backend/public/noise
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const noiseDir = path.join(__dirname, "..", "public", "noise")
try {
    fs.mkdirSync(noiseDir, { recursive: true })
} catch (e) {
    console.error("failed to ensure noise dir", e)
}

// multer is optional at runtime; we dynamically import it in the upload handler so
// the server can start even if multer isn't installed. Install multer to enable uploads.

// List uploaded noise files
router.get("/", async (req, res) => {
    try {
        const files = fs.readdirSync(noiseDir).filter((f) => !f.startsWith("."))
        // return url paths relative to /public
        const list = files.map((f) => ({ name: f, url: `/public/noise/${encodeURIComponent(f)}` }))
        res.json({ files: list })
    } catch (err) {
        console.error("/api/noise list error", err)
        res.status(500).json({ error: "failed to list noise files" })
    }
})

// Upload single noise file (field 'file')
router.post("/upload", async (req, res) => {
    // Dynamically load multer so server can run even if multer is not installed.
    let multerPkg: any
    try {
        // @ts-ignore: dynamic import of optional runtime dependency
        multerPkg = await import('multer')
    } catch (e) {
        return res.status(501).json({ error: 'multer-not-installed', message: 'File upload support is not available. Please install multer in the backend.' })
    }
    const multer = multerPkg.default ?? multerPkg

    const storage = multer.diskStorage({
        destination: (req: express.Request, file: any, cb: (err: Error | null, dest: string) => void) => cb(null, noiseDir),
        filename: (req: express.Request, file: any, cb: (err: Error | null, filename: string) => void) => {
            const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`
            cb(null, safe)
        },
    })

    const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

    // call the middleware manually
    upload.single('file')(req as any, res as any, (err: any) => {
        try {
            if (err) {
                console.error('/api/noise upload middleware error', err)
                return res.status(400).json({ error: 'upload_failed', details: String(err) })
            }
            if (!req.file) return res.status(400).json({ error: 'no file uploaded' })
            const file = req.file
            return res.status(201).json({ name: file.filename, path: `/public/noise/${encodeURIComponent(file.filename)}` })
        } catch (e) {
            console.error('/api/noise upload error', e)
            return res.status(500).json({ error: 'failed to upload file' })
        }
    })
})

// Delete a file by name
const DeleteSchema = z.object({ name: z.string() })
router.delete("/", async (req, res) => {
    try {
        const parsed = DeleteSchema.parse(req.body)
        const target = path.join(noiseDir, parsed.name)
        if (!fs.existsSync(target)) return res.status(404).json({ error: "file not found" })
        fs.unlinkSync(target)
        res.json({ deleted: parsed.name })
    } catch (err) {
        if (err instanceof z.ZodError) return res.status(400).json({ error: "invalid payload", details: err.issues })
        console.error("/api/noise delete error", err)
        res.status(500).json({ error: "failed to delete file" })
    }
})

export default router
