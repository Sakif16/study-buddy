import path from "node:path"
import fs from "node:fs"

import "dotenv/config"

import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import logger from "morgan"
import session from "express-session"

import auth from "./routes/auth.js"
import assignments from "./routes/assignments.js"
import groupStudy from "./routes/groupStudy.js"
import { db } from "./db.js"
import tasksRoutes from "./routes/tasks.js"

import pomodoro from "./routes/pomodoro.js"
import quotes from "./routes/quotes.js"

import notesRoutes from "./routes/notes.js"
import categoriesRoutes from "./routes/categories.js"

const app = express()
const PORT = parseInt(process.env.PORT ?? "3000")

app.use(logger("dev"))
app.use(helmet())
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
)
app.use(cookieParser())

app.use(
  session({
    secret: process.env.SECRET_KEY!,
    resave: false,
    saveUninitialized: false,
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.text())

app.use("/public", express.static(path.join(import.meta.dirname, "public")))
app.use("/uploads", express.static(path.join(import.meta.dirname, "uploads")))

// Public attachment serving for notes (returns inline for images/PDFs)
app.get('/api/notes/:id/attachments/:filename', (req, res) => {
  try {
    const raw = req.params.filename
    const filename = decodeURIComponent(raw)
    if (filename.includes('..') || path.isAbsolute(filename)) return res.status(400).json({ error: 'invalid filename' })
    const candidates = [
      path.join(import.meta.dirname, 'uploads', req.params.id, filename),
      path.join(import.meta.dirname, 'routes', 'uploads', req.params.id, filename),
      path.join(import.meta.dirname, '..', 'uploads', req.params.id, filename),
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
      console.error('[app] attachment not found, checked paths:', candidates)
      return res.status(404).json({ error: 'file not found' })
    }
    console.log('[app] serving attachment from', filePath)

    const ext = path.extname(filename).toLowerCase()
    const inlineTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf']
    if (inlineTypes.includes(ext)) {
      res.setHeader('Content-Disposition', 'inline')
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filename)}"`)
    }
    try { res.type(ext) } catch (e) { }
    res.setHeader('Cache-Control', 'public, max-age=86400')
    return res.sendFile(filePath)
  } catch (err) {
    console.error('[app] serve attachment error', err)
    return res.status(500).json({ error: 'failed to serve attachment' })
  }
})

app.use("/", auth)
app.use("/assignments", assignments)
app.use("/groups", groupStudy)
app.use("/api/notes", notesRoutes)
app.use("/api/categories", categoriesRoutes)

app.listen(PORT, () => {
  console.log(`express-app listening on port ${PORT}`)
})

app.get("/username/:username", async (req, res) => {
  const { username } = req.params

  const user = await db.user.findFirst({
    where: { username },
  })

  res.json(user)
})

app.use("/api/tasks", tasksRoutes)

app.use("/api/pomodoro", pomodoro)
app.use("/api/quotes", quotes)
