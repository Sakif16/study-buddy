import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URL!
const client = await MongoClient.connect(uri)

console.log("database connected established")

const db = client.db("sample_mflix")

export { db }
