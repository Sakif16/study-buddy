import { useState } from "react"

type Message = {
  id: string
  role: "user" | "assistant"
  text: string
  time: string
}

export default function AIBuddy() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])

  const send = () => {
    const t = input.trim()
    if (!t) return
    const now = new Date()
    const time = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    setMessages((s) => [
      ...s,
      { id: String(Date.now()), role: "user", text: t, time },
    ])
    setInput("")

    // Simulate AI response after a short delay
    setTimeout(() => {
      const responseTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
      setMessages((s) => [
        ...s,
        {
          id: `${Date.now()}-ai`,
          role: "assistant",
          text: "I'm your AI study buddy! How can I help you today?",
          time: responseTime,
        },
      ])
    }, 800)
  }

  return (
    <div className="p-8 text-white">
      <h2 className="text-2xl font-semibold text-white mb-6">AI Buddy</h2>

      <div className="w-200 mx-auto rounded-lg shadow-lg overflow-hidden bg-[#08917e]">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-white font-bold">AI Study Assistant</div>
              <div className="text-xs text-white/60">Always here to help</div>
            </div>
          </div>
        </div>

        <div className="p-4 h-[700px] flex flex-col">
          <div className="flex-1 overflow-y-auto px-2 pb-2" id="chat-list">
            {messages.length === 0 ? (
              <div className="text-sm text-white/60">
                Ask me anything about your studies!
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`mb-4 ${m.role === "user" ? "text-right" : ""}`}
                >
                  <div className="text-sm text-white font-semibold">
                    {m.role === "user" ? "You" : "AI Buddy"} •{" "}
                    <span className="text-xs text-white/60">{m.time}</span>
                  </div>
                  <div className="text-white font-medium mt-1">{m.text}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-3 text-gray-800 placeholder-gray-500 outline-none border border-gray-300 rounded"
              />
              <button
                onClick={send}
                className="px-4 py-2 bg-[#1BECC9] text-black rounded-lg font-semibold"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}