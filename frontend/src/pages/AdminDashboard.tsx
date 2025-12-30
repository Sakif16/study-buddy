import { useEffect, useState } from "react"
import { BACKEND_URL } from "../constants"

type User = {
  id: string
  username: string
  email: string
  name?: string | null
  createdAt?: string
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/admin/users`, {
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) setUsers(data.users)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const removeUser = async (id: string) => {
    if (!confirm("Remove user? This action cannot be undone.")) return
    try {
      const res = await fetch(`${BACKEND_URL}/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) {
        setUsers((s) => s.filter((u) => u.id !== id))
      } else {
        alert("Failed to remove user")
      }
    } catch (e) {
      console.error(e)
      alert("Failed to remove user")
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Admin dashboard</h2>

      <section className="bg-white rounded p-4 shadow">
        <h3 className="font-medium mb-2">Users</h3>
        {loading ? (
          <div>Loading…</div>
        ) : users.length === 0 ? (
          <div className="text-sm text-gray-600">No users found</div>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between border-b pb-2"
              >
                <div>
                  <div className="font-medium">{u.username}</div>
                  <div className="text-xs text-gray-600">
                    {u.email} {u.name ? `• ${u.name}` : ""}
                  </div>
                </div>
                <div>
                  <button
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                    onClick={() => removeUser(u.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
