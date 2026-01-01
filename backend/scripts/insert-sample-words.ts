import "dotenv/config"
import { db } from "../db.js"

const SAMPLE = [
  "APPLE",
  "BRAVE",
  "CRANE",
  "ABOUT",
  "ABOVE",
  "CRISP",
  "GREEN",
  "PLANT",
  "WORLD",
  "MUSIC",
]

async function run() {
  for (const w of SAMPLE) {
    try {
      await db.word.upsert({
        where: { text: w },
        update: {},
        create: { text: w },
      })
      console.log("upserted", w)
    } catch (e) {
      console.error("failed to upsert", w, e)
    }
  }
  console.log("done")
  process.exit(0)
}

run()
