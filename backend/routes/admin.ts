/* eslint-disable */
import express from "express"
import { db } from "../db.js"

const router = express.Router()

function ensureAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (!req.session?.admin)
    return res.status(401).json({ success: false, message: "not authorized" })
  next()
}

router.get("/admin/users", ensureAdmin, async (_req, res) => {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    })
    res.json({ success: true, users })
  } catch (e) {
    console.error("/admin/users error", e)
    res.status(500).json({ success: false, message: "server error" })
  }
})

router.delete("/admin/users/:id", ensureAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!id)
      return res.status(400).json({ success: false, message: "missing id" })
    if (id === "admin")
      return res
        .status(400)
        .json({ success: false, message: "cannot delete admin" })

    // cleanup dependent records that can prevent user deletion
    await db.assignment.deleteMany({ where: { userId: id } })
    await db.groupMember.deleteMany({ where: { userId: id } })
    await db.invitation.deleteMany({
      where: { OR: [{ fromId: id }, { toId: id }] },
    })
    await db.message.deleteMany({ where: { senderId: id } })
    await db.userStats.deleteMany({ where: { userId: id } })

    // delete any groups owned by the user and their related data
    const groups = await db.group.findMany({
      where: { ownerId: id },
      select: { id: true },
    })
    for (const g of groups) {
      await db.message.deleteMany({ where: { groupId: g.id } })
      await db.groupMember.deleteMany({ where: { groupId: g.id } })
      await db.invitation.deleteMany({ where: { groupId: g.id } })
      await db.group.delete({ where: { id: g.id } })
    }

    // finally delete the user
    await db.user.delete({ where: { id } })
    res.json({ success: true })
  } catch (e) {
    console.error("/admin/users/:id error", e)
    res
      .status(500)
      .json({ success: false, message: "server error", error: String(e) })
  }
})

router.get("/admin/feedbacks", ensureAdmin, async (_req, res) => {
  try {
    const feedbacks = await db.feedback.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, username: true, name: true } } },
    })
    res.json({ success: true, feedbacks })
  } catch (e) {
    console.error("/admin/feedbacks error", e)
    res.status(500).json({ success: false, message: "server error" })
  }
})

export default router
