import express from "express"
import { db } from "../db.js"
import z from "zod"
import type { Prisma } from "../generated/prisma/client.js"

const router = express.Router()

const CreateAssignment = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Extremely High"]).optional(),
  // accept either ms-since-epoch or ISO string
  endAt: z
    .union([z.number().int().positive(), z.string().datetime()])
    .optional(),
})

router.get("/", async (req, res) => {
  if (!req.session?.user)
    return res
      .status(401)
      .json({ success: false, message: "not authenticated" })

  const assignments = await db.assignment.findMany({
    where: { userId: req.session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return res.json({ success: true, assignments })
})

router.post("/", async (req, res) => {
  if (!req.session?.user)
    return res
      .status(401)
      .json({ success: false, message: "not authenticated" })

  try {
    const payload = CreateAssignment.parse(req.body)

    const data = {
      title: payload.title,
      description: payload.description ?? undefined,
      priority: payload.priority ?? "Low",
      createdAt: new Date(),
      user: { connect: { id: req.session.user.id } },
    } as Prisma.assignmentCreateInput & { endAt?: Date }

    if (payload.endAt) {
      const endAtDate =
        typeof payload.endAt === "number"
          ? new Date(payload.endAt)
          : new Date(payload.endAt)
      data.endAt = endAtDate
    }

    const created = await db.assignment.create({ data })

    return res.json({ success: true, assignment: created })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ success: false, errors: z.flattenError(err) })
    console.error("[assignments] create error", err)
    return res.status(500).json({ success: false, message: "server error" })
  }
})

router.delete("/:id", async (req, res) => {
  if (!req.session?.user)
    return res
      .status(401)
      .json({ success: false, message: "not authenticated" })

  const { id } = req.params
  const assignment = await db.assignment.findUnique({ where: { id } })
  if (!assignment)
    return res.status(404).json({ success: false, message: "not found" })
  if (assignment.userId !== req.session.user.id)
    return res.status(403).json({ success: false, message: "forbidden" })

  await db.assignment.delete({ where: { id } })
  return res.json({ success: true })
})

export default router
