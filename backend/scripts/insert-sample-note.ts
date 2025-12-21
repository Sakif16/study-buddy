import "dotenv/config"
import { db } from "../db.js"

async function main() {
    await db.$connect()

    // find or create a sample user to attach the note to
    let user = await db.user.findFirst()
    if (!user) {
        user = await db.user.create({
            data: {
                username: "sampleuser",
                email: "sample@example.com",
                password: "password123",
                name: "Sample User",
            },
        })
        console.log("Created sample user:", user.id)
    } else {
        console.log("Using existing user:", user.id)
    }

    const note = await db.note.create({
        data: {
            title: "Test note from script",
            content: "This note was inserted by insert-sample-note.ts",
            userId: user.id,
        },
    })

    console.log("Inserted note:", note)

    await db.$disconnect()
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
