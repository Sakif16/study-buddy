import path from "node:path"

import "dotenv/config"

import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import logger from "morgan"

import { db } from "./db.js"

const app = express()
const PORT = parseInt(process.env.PORT ?? "3000")

app.use(logger("dev"))
app.use(helmet())
app.use(cors())
app.use(cookieParser())

app.use(express.json())
app.use(express.urlencoded())
app.use(express.text())

app.use("/public", express.static(path.join(import.meta.dirname, "public")))

app.listen(PORT, () => {
  console.log(`express-app listening on port ${PORT}`)
})

app.get("/:movie", async (req, res) => {
  const { movie } = req.params

  const findings = await db
    .collection("movies")
    .find({ genres: "Western" })
    .project({ _id: 0, title: 1 })
    .limit(3)
    .toArray()

  res.json(findings)
})
