import { useEffect, useState } from "react"
import { BACKEND_URL } from "../constants"

type Feedback = {
  id: string
  content: string
  createdAt: string
  user: { id: string; username: string }
}

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/admin/feedbacks`, {
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) setFeedbacks(data.feedbacks)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">User Feedbacks</h2>

      <section className="bg-white rounded p-4 shadow">
        {loading ? (
          <div>Loading…</div>
        ) : feedbacks.length === 0 ? (
          <div className="text-sm text-gray-600">No feedbacks yet</div>
        ) : (
          <div className="flex flex-col gap-3">
            {feedbacks.map((f) => (
              <div key={f.id} className="border rounded p-3">
                <div className="text-sm text-gray-600 mb-1">
                  From: {f.user?.username}
                </div>
                <div className="font-medium">{f.content}</div>
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(f.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
