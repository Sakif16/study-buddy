import express from "express"
import z from "zod"
import { db } from "../db.js"

const router = express.Router()

// GET /api/wordle/target -> returns today's target for the authenticated user
router.get("/target", async (req, res) => {
  if (!req.session?.user)
    return res
      .status(401)
      .json({ success: false, message: "not authenticated" })

  try {
    const sessionUser = req.session.user
    const today = new Date().toISOString().slice(0, 10)

    // verify user exists
    const dbUser = await db.user.findUnique({ where: { id: sessionUser.id } })
    if (!dbUser)
      return res.status(400).json({ success: false, message: "user not found" })

    // try to find existing state for today
    let state = await db.wordleState.findUnique({
      where: { userId_date: { userId: dbUser.id, date: today } },
      include: { targetWord: true },
    })

    if (!state) {
      // choose a random word from DB and create a state for today
      const words = await db.word.findMany()
      if (!words.length)
        return res.json({ success: false, message: "no words in database" })
      const chosen = words[Math.floor(Math.random() * words.length)]
      state = await db.wordleState.create({
        data: {
          userId: dbUser.id,
          date: today,
          targetWordId: chosen!.id,
          gamesPlayed: 0,
        },
        include: { targetWord: true },
      })
    }

    return res.json({
      success: true,
      targetWord: state.targetWord.text,
      gamesPlayed: state.gamesPlayed,
    })
  } catch (e) {
    console.error("/api/wordle/target error", e)
    return res.status(500).json({ success: false, message: "server error" })
  }
})

// POST /api/wordle/finish -> increment user's daily gamesPlayed by 1 (when a game finishes)
router.post("/finish", async (req, res) => {
  if (!req.session?.user)
    return res
      .status(401)
      .json({ success: false, message: "not authenticated" })

  try {
    const sessionUser = req.session.user
    const today = new Date().toISOString().slice(0, 10)

    // ensure state exists for today and then increment gamesPlayed
    let state = await db.wordleState.findUnique({
      where: { userId_date: { userId: sessionUser.id, date: today } },
    })
    if (!state) {
      // ensure a state exists for today's game
      const words = await db.word.findMany()
      if (!words.length)
        return res.json({ success: false, message: "no words in database" })
      const chosen = words[Math.floor(Math.random() * words.length)]

      state = await db.wordleState.create({
        data: {
          userId: sessionUser.id,
          date: today,
          targetWordId: chosen!.id,
          gamesPlayed: 1,
        },
      })

      return res.json({ success: true, gamesPlayed: state.gamesPlayed })
    }

    const updated = await db.wordleState.update({
      where: { id: state.id },
      data: { gamesPlayed: { increment: 1 } },
    })

    return res.json({ success: true, gamesPlayed: updated.gamesPlayed })
  } catch (e) {
    console.error("/api/wordle/finish error", e)
    return res.status(500).json({ success: false, message: "server error" })
  }
})

// POST /api/wordle/restart -> consume one play and assign a new word (used when user restarts mid-game)
router.post("/restart", async (req, res) => {
  if (!req.session?.user)
    return res
      .status(401)
      .json({ success: false, message: "not authenticated" })

  try {
    const sessionUser = req.session.user
    const today = new Date().toISOString().slice(0, 10)

    // ensure state exists for today
    let state = await db.wordleState.findUnique({
      where: { userId_date: { userId: sessionUser.id, date: today } },
      include: { targetWord: true },
    })

    if (!state) {
      // create state and consume first play
      const words = await db.word.findMany()
      if (!words.length)
        return res.json({ success: false, message: "no words in database" })
      const chosen = words[Math.floor(Math.random() * words.length)]

      state = await db.wordleState.create({
        data: {
          userId: sessionUser.id,
          date: today,
          targetWordId: chosen!.id,
          gamesPlayed: 1,
        },
        include: { targetWord: true },
      })

      return res.json({
        success: true,
        targetWord: state.targetWord.text,
        gamesPlayed: state.gamesPlayed,
      })
    }

    // pick a different random word if possible
    const words = await db.word.findMany()
    if (!words.length)
      return res.json({ success: false, message: "no words in database" })

    let chosen = words[Math.floor(Math.random() * words.length)]
    if (words.length > 1) {
      // try to pick a different word
      let tries = 0
      while (chosen!.id === state.targetWordId && tries < 10) {
        chosen = words[Math.floor(Math.random() * words.length)]
        tries++
      }
    }

    // update state with new target and increment gamesPlayed atomically
    const updatedState = await db.wordleState.update({
      where: { id: state.id },
      data: { gamesPlayed: { increment: 1 }, targetWordId: chosen!.id },
      include: { targetWord: true },
    })

    return res.json({
      success: true,
      targetWord: updatedState.targetWord.text,
      gamesPlayed: updatedState.gamesPlayed,
    })
  } catch (e) {
    console.error("/api/wordle/restart error", e)
    return res.status(500).json({ success: false, message: "server error" })
  }
})

// GET /api/wordle/status -> return authoritative gamesPlayed for today
router.get("/status", async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ success: false })
  try {
    const sessionUser = req.session.user
    const today = new Date().toISOString().slice(0, 10)

    let state = await db.wordleState.findUnique({
      where: { userId_date: { userId: sessionUser.id, date: today } },
      include: { targetWord: true },
    })
    if (!state) {
      const words = await db.word.findMany()
      if (!words.length)
        return res.json({ success: false, message: "no words in database" })
      const chosen = words[Math.floor(Math.random() * words.length)]
      state = await db.wordleState.create({
        data: {
          userId: sessionUser.id,
          date: today,
          targetWordId: chosen!.id,
          gamesPlayed: 0,
        },
        include: { targetWord: true },
      })
    }

    return res.json({
      success: true,
      gamesPlayed: state.gamesPlayed,
      date: state.date,
      targetWord: state.targetWord.text,
    })
  } catch (e) {
    console.error("/api/wordle/status error", e)
    return res.status(500).json({ success: false, message: "server error" })
  }
})

// POST /api/wordle/new -> assign a new target for today for the user WITHOUT consuming a play
router.post("/new", async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ success: false })

  try {
    const sessionUser = req.session.user
    const today = new Date().toISOString().slice(0, 10)

    // load authoritative user record
    const dbUser = await db.user.findUnique({ where: { id: sessionUser.id } })
    if (!dbUser)
      return res.status(400).json({ success: false, message: "user not found" })

    const words = await db.word.findMany()
    if (!words.length)
      return res.json({ success: false, message: "no words in database" })
    const chosen = words[Math.floor(Math.random() * words.length)]

    const state = await db.wordleState.upsert({
      where: { userId_date: { userId: dbUser.id, date: today } },
      update: { targetWordId: chosen!.id },
      create: {
        userId: dbUser.id,
        date: today,
        targetWordId: chosen!.id,
        gamesPlayed: 0,
      },
      include: { targetWord: true },
    })

    return res.json({
      success: true,
      targetWord: state.targetWord.text,
      gamesPlayed: state.gamesPlayed,
    })
  } catch (e) {
    console.error("/api/wordle/new error", e)
    return res.status(500).json({ success: false, message: "server error" })
  }
})

// Admin endpoints: add word(s), list words
const AddWordSchema = z.object({ text: z.string().min(5).max(5) })

router.post("/words", async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ success: false })

  try {
    // simple admin gate: only allow root user or req.session.admin
    if (!req.session.admin && req.session.user?.username !== "root")
      return res.status(403).json({ success: false, message: "forbidden" })

    const payload = AddWordSchema.parse(req.body)
    const text = payload.text.toUpperCase()

    const created = await db.word.create({ data: { text } })
    return res.json({ success: true, word: created })
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.json({ success: false, errors: z.flattenError(e) })
    console.error("/api/wordle/words create error", e)
    return res.status(500).json({ success: false, message: "server error" })
  }
})

router.get("/words", async (req, res) => {
  if (!req.session?.user) return res.status(401).json({ success: false })
  try {
    if (!req.session.admin && req.session.user?.username !== "root")
      return res.status(403).json({ success: false, message: "forbidden" })

    const words = await db.word.findMany({ orderBy: { createdAt: "desc" } })
    return res.json({ success: true, words })
  } catch (e) {
    console.error("/api/wordle/words list error", e)
    return res.status(500).json({ success: false, message: "server error" })
  }
})

export default router
