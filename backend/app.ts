import path from "node:path"

import "dotenv/config"

import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import logger from "morgan"

import { db, UserSchema } from "./db.js"
import z from "zod"
import { Prisma } from "./generated/prisma/client.js"

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

app.get("/username/:username", async (req, res) => {
  const { username } = req.params

  const user = await db.user.findFirst({
    where: { username },
  })

  res.json(user)
})

app.post("/user", async (req, res) => {
  const data = UserSchema.parse(req.body)

  try {
    const user = await db.user.create({ data })
    res.json(user)
  } catch (error) {
    if (error instanceof z.ZodError) console.log(z.flattenError(error))
    else if (error instanceof Prisma.PrismaClientKnownRequestError)
      console.log(error)

    res.end()
  }
})
