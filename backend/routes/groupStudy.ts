import express from "express"
import z from "zod"
import { db } from "../db.js"
import type { Prisma } from "../generated/prisma/client.js"

const router = express.Router()

// auth middleware
const requireAuth = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!req.session?.user)
    return res
      .status(401)
      .json({ success: false, message: "not authenticated" })
  next()
}

router.use(requireAuth)

const CreateGroup = z.object({ name: z.string().min(1) })
const InviteSchema = z.object({
  toUsername: z.string().min(1).optional(),
  toUserId: z.string().min(1).optional(),
  groupId: z.string().min(1),
})
const MessageSchema = z.object({ content: z.string().min(1) })

// GET /users - list all users (exclude current)
router.get("/users", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const users = await db.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, username: true },
    })
    res.json({ success: true, users })
  } catch (err) {
    console.error("[users] list error", err)
    res.status(500).json({ success: false, message: "server error" })
  }
})

// POST /groups - create a group
router.post("/", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const payload = CreateGroup.parse(req.body)
    const ownerId = req.session!.user.id

    const created = await db.group.create({
      data: {
        name: payload.name,
        owner: { connect: { id: ownerId } },
        members: {
          create: { user: { connect: { id: ownerId } }, role: "owner" },
        },
      } as Prisma.GroupCreateInput,
    })

    res.status(201).json({ success: true, group: created })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ success: false, errors: z.flattenError(err) })
    console.error("[groups] create error", err)
    res.status(500).json({ success: false, message: "server error" })
  }
})

// POST /groups/:id/invite - send invitation by username
router.post("/:id/invite", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const { id: groupId } = req.params
    const payload = InviteSchema.parse({ ...req.body, groupId })
    const fromId = req.session!.user.id

    let toUser = null
    if (payload.toUserId) {
      toUser = await db.user.findUnique({ where: { id: payload.toUserId } })
    } else if (payload.toUsername) {
      toUser = await db.user.findFirst({
        where: { username: payload.toUsername },
      })
    }
    if (!toUser)
      return res
        .status(404)
        .json({ success: false, message: "target user not found" })

    // ensure group exists and requester is a member
    const group = await db.group.findUnique({ where: { id: groupId } })
    if (!group)
      return res
        .status(404)
        .json({ success: false, message: "group not found" })

    // create invitation
    const inv = await db.invitation.create({
      data: {
        group: { connect: { id: groupId } },
        from: { connect: { id: fromId } },
        to: { connect: { id: toUser.id } },
      } as Prisma.InvitationCreateInput,
    })

    res.json({ success: true, invitation: inv })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ success: false, errors: z.flattenError(err) })
    console.error("[groups] invite error", err)
    res.status(500).json({ success: false, message: "server error" })
  }
})

// GET /invitations - list incoming invitations
router.get("/invitations", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const invitations = await db.invitation.findMany({
      where: { toId: userId, status: "PENDING" },
      include: { group: true, from: true },
      orderBy: { createdAt: "desc" },
    })
    res.json({ success: true, invitations })
  } catch (err) {
    console.error("[invitations] list error", err)
    res.status(500).json({ success: false, message: "server error" })
  }
})

// GET /invitations/sent - list invitations sent by current user
router.get("/invitations/sent", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const invitations = await db.invitation.findMany({
      where: { fromId: userId },
      include: { group: true, to: true },
      orderBy: { createdAt: "desc" },
    })
    res.json({ success: true, invitations })
  } catch (err) {
    console.error("[invitations] sent list error", err)
    res.status(500).json({ success: false, message: "server error" })
  }
})

// POST /invitations/:id/accept - accept invitation
router.post("/invitations/:id/accept", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const { id } = req.params
    const userId = req.session!.user.id
    const invitation = await db.invitation.findUnique({ where: { id } })
    if (!invitation)
      return res
        .status(404)
        .json({ success: false, message: "invitation not found" })
    if (invitation.toId !== userId)
      return res.status(403).json({ success: false, message: "forbidden" })

    // mark accepted and add to members
    await db.invitation.update({ where: { id }, data: { status: "ACCEPTED" } })
    await db.groupMember.create({
      data: {
        group: { connect: { id: invitation.groupId } },
        user: { connect: { id: userId } },
      },
    })

    res.json({ success: true })
  } catch (err) {
    console.error("[invitations] accept error", err)
    res.status(500).json({ success: false, message: "server error" })
  }
})

// POST /invitations/:id/decline - decline invitation
router.post("/invitations/:id/decline", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const { id } = req.params
    const userId = req.session!.user.id
    const invitation = await db.invitation.findUnique({ where: { id } })
    if (!invitation)
      return res
        .status(404)
        .json({ success: false, message: "invitation not found" })
    if (invitation.toId !== userId)
      return res.status(403).json({ success: false, message: "forbidden" })

    await db.invitation.update({ where: { id }, data: { status: "DECLINED" } })
    res.json({ success: true })
  } catch (err) {
    console.error("[invitations] decline error", err)
    res.status(500).json({ success: false, message: "server error" })
  }
})

// GET /:id/messages
router.get("/:id/messages", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const { id } = req.params
    const userId = req.session!.user.id

    // ensure user is member
    const membership = await db.groupMember.findFirst({
      where: { groupId: id, userId },
    })
    if (!membership)
      return res.status(403).json({ success: false, message: "forbidden" })

    const messages = await db.message.findMany({
      where: { groupId: id },
      include: { sender: true },
      orderBy: { createdAt: "asc" },
    })
    res.json({ success: true, messages })
  } catch (err) {
    console.error("[messages] list error", err)
    res.status(500).json({ success: false, message: "server error" })
  }
})

// GET /:id/members - list members of a group
router.get("/:id/members", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const { id } = req.params
    const userId = req.session!.user.id

    // ensure requester is a member
    const membership = await db.groupMember.findFirst({
      where: { groupId: id, userId },
    })
    if (!membership)
      return res.status(403).json({ success: false, message: "forbidden" })

    const members = await db.groupMember.findMany({
      where: { groupId: id },
      include: { user: true },
    })
    const users = members.map((m) => ({
      id: m.user.id,
      username: m.user.username,
    }))
    res.json({ success: true, users })
  } catch (err) {
    console.error("[groups] members error", err)
    res.status(500).json({ success: false, message: "server error" })
  }
})

// POST /:id/messages
router.post("/:id/messages", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const { id } = req.params
    const payload = MessageSchema.parse(req.body)
    const userId = req.session!.user.id

    const membership = await db.groupMember.findFirst({
      where: { groupId: id, userId },
    })
    if (!membership)
      return res.status(403).json({ success: false, message: "forbidden" })

    const created = await db.message.create({
      data: {
        group: { connect: { id } },
        sender: { connect: { id: userId } },
        content: payload.content,
      } as Prisma.MessageCreateInput,
      include: { sender: true },
    })
    res.status(201).json({ success: true, message: created })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ success: false, errors: z.flattenError(err) })
    console.error("[messages] create error", err)
    res.status(500).json({ success: false, message: "server error" })
  }
})

// GET / - list groups current user belongs to
router.get("/", async (req, res) => {
  try {
    if (!req.session.user) throw new Error("not authenticated")
    const userId = req.session!.user.id
    const memberships = await db.groupMember.findMany({
      where: { userId },
      include: { group: true },
    })
    const groups = memberships.map((m) => m.group)
    res.json({ success: true, groups })
  } catch (err) {
    console.error("[groups] list error", err)
    res.status(500).json({ success: false, message: "server error" })
  }
})

export default router
