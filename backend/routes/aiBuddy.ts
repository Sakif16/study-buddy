import express from "express"

const router = express.Router()

router.post("/chat", async (req, res) => {
    try {
        const prompt = (req.body?.prompt ?? "").toString()
        if (!prompt) return res.status(400).json({ error: "prompt required" })

        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) return res.status(500).json({ error: "OpenAI API key not configured" })

        const payload = {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are Study Buddy, a concise and friendly assistant that helps students with study plans, tips, and explanations." },
                { role: "user", content: prompt },
            ],
            max_tokens: 800,
            temperature: 0.7,
        }

        const r = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        })

        if (!r.ok) {
            const text = await r.text()
            console.error("OpenAI upstream returned", r.status, r.statusText, "-", text)
            return res.status(502).json({ error: "upstream error", details: text })
        }

        const data = await r.json()
        const reply = data.choices?.[0]?.message?.content ?? ""
        res.json({ reply })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "internal error" })
    }
})

export default router
