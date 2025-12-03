import "dotenv/config"
import { PrismaClient } from "./generated/prisma/client.js"
import z from "zod"

export const db = new PrismaClient()

console.log("database connected established")

export const UserSchema = z.object({
  username: z.string(),
  email: z.email(),
  password: z.string().min(8).max(20),
  name: z.string().max(20).nullable().default(null),
})
