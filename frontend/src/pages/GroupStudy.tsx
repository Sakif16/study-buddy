import { useState } from "react"

type ChatMessage = {
  id: string
  author: string
  text: string
  time: string
  self?: boolean
}

export default function GroupStudy() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])

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
      { id: String(Date.now()), author: "You", text: t, time, self: true },
    ])
    setInput("")
  }

  return (
    <div className="p-8 text-white">
      <h2 className="text-2xl font-semibold text-white mb-6">Group Study</h2>

      <div className="w-full max-w-[95%] mx-auto">
        <div className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-white font-semibold">Study Group</div>
            </div>
          </div>
          <div className="text-sm text-white/60">Public • Mock</div>
        </div>

        <div className="p-4 h-[700px] flex flex-col">
          <div className="flex-1 overflow-y-auto px-2 pb-2" id="chat-list">
            {messages.length === 0 ? (
              <div className="text-sm text-white/60">
                No messages yet — start the conversation.
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="mb-4">
                  <div className="text-sm text-white/70">
                    {m.self ? "You" : m.author} •{" "}
                    <span className="text-xs text-white/50">{m.time}</span>
                  </div>
                  <div className="text-white mt-1">{m.text}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-3">
            <div className="flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message to the group..."
                className="flex-1 px-4 py-3 text-white placeholder-white/60 outline-none"
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
