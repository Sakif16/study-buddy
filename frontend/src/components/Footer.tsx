import { useState } from "react"

export default function Footer() {
  const [feedback, setFeedback] = useState("")
  const [status, setStatus] = useState<"idle" | "sent">("idle")
  const MAX = 200

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = feedback.trim()
    if (!trimmed) return

    // For now just log the feedback; backend integration can be added later
    console.log("User feedback:", trimmed)
    setStatus("sent")
    setFeedback("")

    // Clear the success message after a short delay
    setTimeout(() => setStatus("idle"), 3000)
  }

  return (
    <footer className="bg-[#DAF9EF] text-black">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center md:justify-between gap-4">
        <div className="text-sm">© Study Buddy</div>

        <form
          onSubmit={handleSubmit}
          className="flex items-start gap-3 w-full md:w-auto"
        >
          <label htmlFor="footer-feedback" className="sr-only">
            Send feedback
          </label>

          <textarea
            id="footer-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            maxLength={MAX}
            placeholder={`Send feedback (${MAX} characters max)`}
            className="resize-none w-full md:w-64 h-20 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-300 text-sm"
          />

          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-600 mb-1">
              {feedback.length}/{MAX}
            </div>
            <button
              type="submit"
              disabled={!feedback.trim()}
              className="inline-flex items-center px-3 py-1 bg-teal-500 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>

        {status === "sent" && (
          <div className="mt-2 md:mt-0 text-sm text-green-600">
            ✅ Thanks for your feedback!
          </div>
        )}
      </div>
    </footer>
  )
}
