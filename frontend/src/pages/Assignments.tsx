import { useContext, useEffect, useState } from "react"
import AuthApi from "../AuthApi"

type Assignment = {
  id: string
  title: string
  description: string
  priority: "Low" | "Medium" | "High" | "Extremely High"
  endAt: number // timestamp in ms
  createdAt: number
}

const STORAGE_KEY = "studybuddy_assignments"

const formatRemaining = (ms: number) => {
  if (ms <= 0) return "Time's up"
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)
  return parts.join(" ")
}

const formatRemainingShort = (ms: number) => {
  if (ms <= 0) return "0s"
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (days) return `${days}d ${hours}h`
  if (hours) return `${hours}h ${minutes}m`
  if (minutes) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<Assignment["priority"]>("Low")
  const [days, setDays] = useState<number>(0)
  const [hours, setHours] = useState<number>(0)
  const [minutes, setMinutes] = useState<number>(0)
  const [, setTick] = useState(0) // used to trigger re-render for countdowns

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const authContext = useContext(AuthApi)

  // load from backend when authenticated (or attempt to)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://localhost:3000/assignments", {
          credentials: "include",
        })
        if (!res.ok) return
        const data = await res.json()
        if (!data?.success || !Array.isArray(data.assignments)) return
        const mapped: Assignment[] = data.assignments.map((a: any) => ({
          id: a.id,
          title: a.title,
          description: a.description ?? "",
          priority: a.priority ?? "Low",
          endAt: a.endAt ? new Date(a.endAt).getTime() : Date.now(),
          createdAt: a.createdAt ? new Date(a.createdAt).getTime() : Date.now(),
        }))
        setAssignments(mapped)
      } catch {
        // ignore and keep local storage fallback
        console.warn("failed to load assignments from server")
      }
    }

    load()
    // run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments))
  }, [assignments])

  const addAssignment = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!title.trim()) return
    const totalMs =
      ((days || 0) * 24 * 3600 + (hours || 0) * 3600 + (minutes || 0) * 60) *
      1000
    const endAt = Date.now() + Math.max(totalMs, 0)
    // try to persist on server if authenticated
    const payload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      endAt,
    }

    try {
      const res = await fetch("http://localhost:3000/assignments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const body = await res.json()
        if (body?.success && body.assignment) {
          const a = body.assignment
          const newItem: Assignment = {
            id: a.id,
            title: a.title,
            description: a.description ?? "",
            priority: a.priority ?? "Low",
            endAt: a.endAt ? new Date(a.endAt).getTime() : Date.now(),
            createdAt: a.createdAt
              ? new Date(a.createdAt).getTime()
              : Date.now(),
          }
          setAssignments((s) => [newItem, ...s])
        }
      } else {
        throw new Error("server returned " + res.status)
      }
    } catch {
      // fallback to local-only behavior
      const newItem: Assignment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: title.trim(),
        description: description.trim(),
        priority,
        endAt,
        createdAt: Date.now(),
      }
      setAssignments((s) => [newItem, ...s])
    }
    setTitle("")
    setDescription("")
    setPriority("Low")
    setDays(0)
    setHours(0)
    setMinutes(0)
  }

  const removeAssignment = (id: string) => {
    // attempt server delete, but always update UI
    fetch(`http://localhost:3000/assignments/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {})
    setAssignments((s) => s.filter((a) => a.id !== id))
  }

  const getPriorityClasses = (p: Assignment["priority"]) => {
    switch (p) {
      case "Low":
        return "text-sm px-2 py-1 rounded bg-green-500 text-white"
      case "Medium":
        return "text-sm px-2 py-1 rounded bg-yellow-400 text-black"
      case "High":
        return "text-sm px-2 py-1 rounded bg-red-500 text-white"
      case "Extremely High":
        return "text-sm px-2 py-1 rounded bg-purple-600 text-white"
      default:
        return "text-sm px-2 py-1 rounded bg-gray-700 text-white"
    }
  }

  const getPriorityHex = (p: Assignment["priority"]) => {
    switch (p) {
      case "Low":
        return "#16a34a"
      case "Medium":
        return "#f59e0b"
      case "High":
        return "#ef4444"
      case "Extremely High":
        return "#7c3aed"
      default:
        return "#374151"
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-black">Assignments</h2>

        <form
          onSubmit={addAssignment}
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="block text-gray-700 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-50 text-black outline-none border border-gray-200"
              placeholder="Assignment title"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-gray-700 mb-1">
              One-line description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-50 text-black outline-none border border-gray-200"
              placeholder="Short description"
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as Assignment["priority"])
              }
              className="w-full px-3 py-2 rounded bg-gray-50 text-black outline-none border border-gray-200"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Extremely High</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-1">
              Countdown (D:H:M)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-1/3 px-2 py-2 rounded bg-gray-50 text-black outline-none border border-gray-200"
                placeholder="Days"
              />
              <input
                type="number"
                min={0}
                max={23}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-1/3 px-2 py-2 rounded bg-gray-50 text-black outline-none border border-gray-200"
                placeholder="Hours"
              />
              <input
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-1/3 px-2 py-2 rounded bg-gray-50 text-black outline-none border border-gray-200"
                placeholder="Minutes"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="mt-2 px-4 py-2 bg-[#1BECC9] text-black font-semibold rounded hover:brightness-95"
            >
              Add assignment
            </button>
          </div>
        </form>

        <div className="mt-8 space-y-4">
          {assignments.length === 0 && (
            <p className="text-gray-600">No assignments yet.</p>
          )}

          {assignments.map((a) => {
            const remaining = a.endAt - Date.now()
            return (
              <div
                key={a.id}
                className="bg-gray-50 rounded p-4 flex items-start justify-between border border-gray-100"
              >
                <div className="flex items-start gap-4">
                  {/* Circular timer */}
                  <div className="w-14 h-14 flex items-center justify-center">
                    <svg viewBox="0 0 48 48" className="w-12 h-12">
                      <title>{a.title + " remaining"}</title>
                      <defs />
                      <g transform="rotate(-90 24 24)">
                        <circle
                          cx="24"
                          cy="24"
                          r="18"
                          stroke="#e5e7eb"
                          strokeWidth="4"
                          fill="none"
                        />
                        {(() => {
                          const total = Math.max(a.endAt - a.createdAt, 0)
                          const remainingLocal = Math.max(
                            a.endAt - Date.now(),
                            0,
                          )
                          const progress =
                            total > 0 ? remainingLocal / total : 0
                          const radius = 18
                          const circumference = 2 * Math.PI * radius
                          const offset = circumference * (1 - progress)
                          const stroke = getPriorityHex(a.priority)
                          return (
                            <circle
                              cx="24"
                              cy="24"
                              r={radius}
                              stroke={stroke}
                              strokeWidth="4"
                              strokeLinecap="round"
                              fill="none"
                              strokeDasharray={`${circumference}`}
                              strokeDashoffset={offset}
                              style={{
                                transition: "stroke-dashoffset 0.8s linear",
                              }}
                            />
                          )
                        })()}
                      </g>
                      <text
                        x="24"
                        y="26"
                        textAnchor="middle"
                        fontSize="9"
                        fill={getPriorityHex(a.priority)}
                        className="font-medium"
                      >
                        {formatRemainingShort(remaining)}
                      </text>
                    </svg>
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-black">
                        {a.title}
                      </h3>
                      <span className={getPriorityClasses(a.priority)}>
                        {a.priority}
                      </span>
                    </div>
                    {a.description && (
                      <p className="text-gray-700 mt-1">{a.description}</p>
                    )}
                    <p className="text-gray-500 mt-2">
                      Due in: {formatRemaining(remaining)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => removeAssignment(a.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
