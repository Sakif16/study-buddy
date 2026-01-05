import "dotenv/config"
import { MongoClient } from "mongodb"

// allow DATABASE_URL as a fallback for MONGO_URI
const uri = process.env.MONGO_URI ?? process.env.DATABASE_URL
if (!uri) {
  console.error("MONGO_URI or DATABASE_URL not set. Set it in your environment before running this script.")
  process.exit(1)
}

let dbName = process.env.MONGO_DB_NAME ?? "study_buddy"
try {
  if (!process.env.MONGO_DB_NAME && uri) {
    const m = uri.match(/\/([^\/?]+)(?:\?|$)/)
    if (m && m[1]) dbName = m[1]
  }
} catch {
  // ignore
}

const SUGGESTIONS = [
  // Health
  { category: "Health", text: "Stand and stretch for 3 minutes." },
  { category: "Health", text: "Drink a glass of water." },
  { category: "Health", text: "Take a short walk around the room." },

  // Mental
  { category: "Mental", text: "Close your eyes and take 10 deep breaths." },
  { category: "Mental", text: "Do a 1-minute mindfulness check-in." },
  { category: "Mental", text: "Write down one thing you're grateful for." },

  // Environment
  { category: "Environment", text: "Open a window for fresh air." },
  { category: "Environment", text: "Tidy one small area on your desk." },
  { category: "Environment", text: "Adjust lighting to reduce glare." },

  // Quick Energy
  { category: "Quick Energy", text: "Do 10 quick jumping jacks." },
  { category: "Quick Energy", text: "Have a healthy snack (fruit or nuts)." },
  { category: "Quick Energy", text: "Take 30 seconds of brisk marching in place." },
]

async function seed() {
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db(dbName)
    const coll = db.collection("studyBreakSuggestions")

    for (const s of SUGGESTIONS) {
      // upsert by exact text to avoid duplicates
      const existing = await coll.findOne({ text: s.text })
      if (existing) {
        console.log("skipped exists:", s.text)
        continue
      }
      const doc = { category: s.category, text: s.text, createdAt: new Date().toISOString() }
      await coll.insertOne(doc)
      console.log("inserted:", s.text)
    }
    console.log("seed complete")
  } catch (err) {
    console.error("seed error", err)
    process.exitCode = 1
  } finally {
    await client.close()
  }
}

seed()
