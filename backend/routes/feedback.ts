/* eslint-disable */
import express from "express"
import { db } from "../db.js"
import z from "zod"

const router = express.Router()

const FeedbackSchema = z.object({
  content: z.string().min(1).max(200),
})

router.post("/api/feedback", async (req, res) => {
  try {
    if (!req.session?.user)
      return res
        .status(401)
        .json({ success: false, message: "not authenticated" })

    const { content } = FeedbackSchema.parse(req.body)

    const created = await db.feedback.create({
      data: { content, userId: req.session.user.id },
    })

    return res.json({ success: true, feedback: created })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.json({ success: false, errors: z.flattenError(error) })
    }
    console.error("/api/feedback error", error)
    return res.status(500).json({ success: false, message: "server error" })
  }
})

export default router
