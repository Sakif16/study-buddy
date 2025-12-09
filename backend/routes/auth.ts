import { db, LoginSchema, RegisterSchema } from "../db.js"
import z from "zod"
import { Prisma, type user } from "../generated/prisma/client.js"
import express from "express"

const router = express.Router()

router.get("/auth", (req, res) => res.json({ status: !!req.session?.user }))

router.get("/logout", (req) => {
  const username = req.session?.user?.username
  req.session.destroy(() => {
    if (username) console.log(`${username} logged out`)
  })
})

router.post("/login", async (req, res) => {
  try {
    const { username, password } = LoginSchema.parse(req.body)
    const user = await db.user.findUnique({
      where: {
        username,
        password,
      },
    })

    if (!user) {
      return res.json({
        success: false,
        message: "invalid credentials",
      })
    }

    // session code here
    req.session.user = user

    return res.json({
      success: true,
      user,
    })
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
    const data = RegisterSchema.parse(req.body)
    const user = await db.user.create({ data })

    // session code here
    req.session.user = user
    return res.json({ success: true, user })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.json({
        success: false,
        errors: z.flattenError(error),
      })
    } else if (error instanceof Prisma.PrismaClientKnownRequestError)
      if (error.code === "P2002") {
        let source = "impossible"

        console.log(error)

        if (error.meta!.target === "user_username_key") source = "username"
        else if (error.meta!.target === "user_email_key") source = "email"

        return res.json({
          success: false,
          message: `${source} already taken`,
        })
      }

    throw error
  }
})

declare module "express-session" {
  interface SessionData {
    user?: user
  }
}

export default router
