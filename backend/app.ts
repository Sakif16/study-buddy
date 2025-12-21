import path from "node:path"

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

app.use("/", auth)
app.use("/assignments", assignments)
app.use("/groups", groupStudy)

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

