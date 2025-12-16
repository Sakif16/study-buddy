import { db, LoginSchema, RegisterSchema } from "../db.js"
import z from "zod"
import bcrypt from "bcryptjs"
import { Prisma, type user } from "../generated/prisma/client.js"
import express from "express"

const router = express.Router()

router.get("/auth", (req, res) =>
  res.json({
    status: !!req.session?.user,
    user: req.session?.user
      ? {
          id: req.session.user.id,
          username: req.session.user.username,
          name: req.session.user.name,
        }
      : null,
  }),
)

// update profile (username / password)
router.patch("/profile", async (req, res) => {
  if (!req.session?.user)
    return res
      .status(401)
      .json({ success: false, message: "not authenticated" })

  try {
    const ProfileSchema = z.object({
      username: z.string().min(1),
      password: z.string().min(8).max(20).optional(),
    })

    const payload = ProfileSchema.parse(req.body)

    const currentUser = req.session.user!

    // if username changes, ensure it's not taken by someone else
    if (payload.username && payload.username !== currentUser.username) {
      const existing = await db.user.findFirst({
        where: { username: payload.username },
      })
      if (existing && existing.id !== currentUser.id) {
        return res.json({ success: false, message: "username already taken" })
      }
    }

    const updateData: Partial<Prisma.userUpdateInput> = {}
    if (payload.username) updateData.username = payload.username
    if (payload.password)
      updateData.password = await bcrypt.hash(payload.password, 10)

    const updated = await db.user.update({
      where: { id: currentUser.id },
      data: updateData,
    })

    // update session and return safe user
    req.session.user = updated as unknown as user
    const safeUser = {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      name: updated.name ?? null,
    }
    return res.json({ success: true, user: safeUser })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.json({ success: false, errors: z.flattenError(error) })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        let source = "impossible"
        if (error.meta!.target === "user_username_key") source = "username"
        else if (error.meta!.target === "user_email_key") source = "email"
        return res.json({ success: false, message: `${source} already taken` })
      }
    }

    console.error("[profile] unexpected error", error)
    return res
      .status(500)
      .json({ success: false, message: "server error", error: String(error) })
  }
})

router.get("/logout", (req, res) => {
  const username = req.session?.user?.username
  req.session.destroy((err) => {
    if (err) {
      console.error("session destroy error", err)
      return res.status(500).json({ success: false, message: "logout failed" })
    }
    // clear session cookie
    res.clearCookie("connect.sid")
    if (username) console.log(`${username} logged out`)
    return res.json({ success: true })
  })
})

router.post("/login", async (req, res) => {
  try {
    const { username, password } = LoginSchema.parse(req.body)
    const user = await db.user.findUnique({ where: { username } })

    if (!user)
      return res.json({ success: false, message: "invalid credentials" })

    let ok = await bcrypt.compare(password, user.password)
    // graceful migration: if stored password is plaintext (legacy), accept and re-hash
    if (!ok && password === user.password) {
      const newHash = await bcrypt.hash(password, 10)
      await db.user.update({
        where: { id: user.id },
        data: { password: newHash },
      })
      ok = true
    }

    if (!ok) return res.json({ success: false, message: "invalid credentials" })

    // session code here
    req.session.user = user as unknown as user

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name ?? null,
    }
    return res.json({ success: true, user: safeUser })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.json({
        success: false,
        errors: z.flattenError(error),
      })
    }
  }
})

router.post("/register", async (req, res) => {
  try {
    console.log("[register] incoming body:", req.body)

    const data = RegisterSchema.parse(req.body)

    const createData = {
      username: data.username,
      email: data.email,
      password: await bcrypt.hash(data.password, 10),
      name: data.name ?? null,
    }

    const user = await db.user.create({ data: createData })
    console.log("[register] created user id:", user.id)

    // session code here (store a safe user payload without password)
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name ?? null,
    }
    // store full user if you prefer; cast to any to satisfy SessionData typing
    req.session.user = user as unknown as user
    return res.json({ success: true, user: safeUser })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.json({
        success: false,
        errors: z.flattenError(error),
      })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        let source = "impossible"

        console.log("[register] unique constraint error", error)

        if (error.meta!.target === "user_username_key") source = "username"
        else if (error.meta!.target === "user_email_key") source = "email"

        return res.json({
          success: false,
          message: `${source} already taken`,
        })
      }
    }

    console.error("[register] unexpected error", error)
    return res
      .status(500)
      .json({ success: false, message: "server error", error: String(error) })
  }
})

declare module "express-session" {
  interface SessionData {
    user?: user
  }
}

export default router
