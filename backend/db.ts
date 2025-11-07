import { MongoClient } from "mongodb"

const uri = "mongodb://localhost:27017"
const client = await MongoClient.connect(uri)

console.log("database connected established")

const db = client.db("study-buddy")

export { db }
