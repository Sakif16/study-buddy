import path from "node:path"

import cookieParser from "cookie-parser"
import cors from "cors"
import express from "express"
import helmet from "helmet"
import logger from "morgan"

import "dotenv/config"
import { createClient } from "@supabase/supabase-js"

import { type Database } from "./database.types.js"

const app = express()
const PORT = parseInt(process.env.PORT ?? "3000", 10)

app.use(logger("dev"))
app.use(helmet())
app.use(cors())
app.use(cookieParser())

app.use(express.json())
app.use(express.urlencoded())
app.use(express.text())

app.use("/public", express.static(path.join(import.meta.dirname, "public")))

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
)

app.listen(PORT, () => {
  console.log(`express-app listening on port ${PORT}`)
})

app.get("/", async (req, res) => {
  const { data, error } = await supabase.from("movies").select()
  if (error) throw error

  res.json(data[0]?.genre)
})
