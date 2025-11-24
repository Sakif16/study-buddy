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

      <div className="max-w-4xl w-full mx-auto bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-white/6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1BECC9] rounded-full flex items-center justify-center text-black font-bold">
              GS
            </div>
            <div>
              <div className="text-white font-semibold">Study Group</div>
              <div className="text-xs text-white/60">3 online</div>
            </div>
          </div>
          <div className="text-sm text-white/60">Public • Mock</div>
        </div>

        <div className="p-4 h-[700px] bg-gradient-to-b from-transparent to-black/10 flex flex-col">
          <div
            className="flex-1 overflow-y-auto space-y-4 px-2 pb-2"
            id="chat-list"
          >
            {messages.length === 0 ? (
              <div className="text-sm text-white/60">
                No messages yet — start the conversation.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${m.self ? "justify-end" : "justify-start"}`}
                >
                  {!m.self && (
                    <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center text-sm font-semibold text-[#1BECC9]">
                      {m.author.charAt(0)}
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] ${m.self ? "ml-auto text-right" : ""}`}
                  >
                    <div
                      className={`${m.self ? "bg-[#1BECC9] text-black" : "bg-white/6 text-white"} px-3 py-2 rounded-xl inline-block`}
                    >
                      {m.text}
                    </div>
                    <div className="text-xs text-white/50 mt-1">
                      {m.self ? "You" : m.author} • {m.time}
                    </div>
                  </div>

                  {m.self && <div className="w-8" />}
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-white/6">
            <div className="flex items-center gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message to the group..."
                className="flex-1 px-4 py-3 rounded-lg bg-black/30 text-white placeholder-white/60 outline-none border border-white/6"
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
