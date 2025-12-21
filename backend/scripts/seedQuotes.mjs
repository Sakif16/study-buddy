import "dotenv/config"
import { PrismaClient } from "../generated/prisma/client.js"

const db = new PrismaClient()

const QUOTES = [
  { text: "Start where you are. - Arthur Ashe", author: "Arthur Ashe" },
  { text: "Keep going. - Sam Levenson", author: "Sam Levenson" },
  { text: "Start to be great. - Zig Ziglar", author: "Zig Ziglar" },
  { text: "Choose discipline. - Abraham Lincoln", author: "Abraham Lincoln" },
  { text: "Repeat small efforts. - Robert Collier", author: "Robert Collier" },
  { text: "Persist daily. - Walter Elliot", author: "Walter Elliot" },
  { text: "Do it today. - Mahatma Gandhi", author: "Mahatma Gandhi" },
  { text: "Small deeds matter. - Peter Marshall", author: "Peter Marshall" },
  { text: "Hard jobs first. - Dale Carnegie", author: "Dale Carnegie" },
  { text: "You make a difference. - William James", author: "William James" },
  { text: "Be all in. - Bryan Hutchinson", author: "Bryan Hutchinson" },
  { text: "Little becomes a lot. - Anonymous", author: "Anonymous" },
]

async function seed() {
  try {
    for (const q of QUOTES) {
      // avoid duplicates
      const exists = await db.quote.findFirst({ where: { text: q.text } })
      if (!exists) {
        await db.quote.create({ data: { text: q.text, author: q.author ?? null } })
        console.log("inserted:", q.text)
      } else {
        console.log("skipped exists:", q.text)
      }
    }
  } catch (err) {
    console.error(err)
  } finally {
    await db.$disconnect()
  }
}

seed()
