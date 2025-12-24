// export default function Home() {
//   return (
//     <div className="p-8 text-white">
//       <h2 className="text-2xl font-semibold text-white">Home</h2>
//       <p className="text-white/90">Landing page (blank)</p>
//     </div>
//   )
// }

import { useEffect, useMemo, useState } from "react"

type Task = {
  id: string
  title: string
  notes?: string
  //createdDate: string // dd/mm/yyyy
  dueDate?: string // dd/mm/yyyy
  dueTime?: string
  completed?: boolean
}

//const STORAGE_KEY = "study-buddy.tasks.v2"

// function uid() {
//   return Math.random().toString(36).slice(2, 9)
// }

function formatDateDisplay(d: Date) {
  const day = String(d.getDate()).padStart(2, "0")
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const y = d.getFullYear()
  return `${day}/${m}/${y}`
}

function parseDisplayToDate(str: string) {
  const [day, month, year] = str.split("/").map(Number) as [
    number,
    number,
    number,
  ]
  return new Date(year, month - 1, day)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}
function monthName(date: Date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" })
}

export default function Home() {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  )
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    formatDateDisplay(new Date()),
  )
  const [tasks, setTasks] = useState<Task[]>([])
  const [editing, setEditing] = useState<Task | null>(null)
  const [showForm, setShowForm] = useState(false)

  // useEffect(() => {
  //   try {
  //     const raw = localStorage.getItem(STORAGE_KEY)
  //     if (raw) setTasks(JSON.parse(raw))
  //   } catch { }
  // }, [])

  // useEffect(() => {
  //   try {
  //     localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  //   } catch { }
  // }, [tasks])

  const API = "http://localhost:3000/api"

  // Load tasks from backend on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API}/tasks`, { credentials: "include" })
        if (!res.ok) throw new Error("Failed to fetch tasks")
        const data = await res.json()
        if (!cancelled) setTasks(data)
      } catch (err) {
        console.error("fetch tasks error:", err)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // API helpers
  async function saveTaskAPI(task: Task) {
    try {
      if (task.id) {
        // UPDATE
        const res = await fetch(`${API}/tasks/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
          credentials: "include",
        })
        const updated = await res.json()
        setTasks((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      } else {
        // CREATE
        const res = await fetch(`${API}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
          credentials: "include",
        })
        const created = await res.json()
        setTasks((prev) => [...prev, created])
      }
    } catch (err) {
      console.error("saveTaskAPI error:", err)
    }
  }

  async function removeTaskAPI(id: string) {
    try {
      const res = await fetch(`${API}/tasks/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.status === 204 || res.ok)
        setTasks((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error("removeTaskAPI error:", err)
    }
  }

  async function toggleCompleteAPI(id: string) {
    try {
      const res = await fetch(`${API}/tasks/${id}/toggle`, {
        method: "PATCH",
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to toggle")
      const updated = await res.json()
      setTasks((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    } catch (err) {
      console.error("toggleCompleteAPI error:", err)
    }
  }

  const daysGrid = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const firstWeekDay = start.getDay()
    const cells: Date[] = []

    for (let i = firstWeekDay - 1; i >= 0; i--) {
      const d = new Date(start)
      d.setDate(start.getDate() - (i + 1))
      cells.push(d)
    }
    for (let d = 1; d <= end.getDate(); d++) {
      cells.push(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d),
      )
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1]
      const n = new Date(last!)
      n.setDate(last!.getDate() + 1)
      cells.push(n)
    }
    return cells
  }, [currentMonth])

  // --- Updated helper: filter tasks by dueDate instead of createdDate ---
  function tasksForDueDate(dateStr: string) {
    return tasks.filter((t) => t.dueDate === dateStr)
  }

  function changeMonth(offset: number) {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + offset)
    setCurrentMonth(startOfMonth(d))
    setSelectedDate(formatDateDisplay(startOfMonth(d)))
  }

  function onCreate(dateDisplay: string) {
    setEditing({
      //id: uid(),
      title: "",
      dueDate: dateDisplay,
      //dueDate: "",
    } as any)
    setShowForm(true)
  }

  function saveTask(t: Task) {
    saveTaskAPI(t)
    setShowForm(false)
    setEditing(null)
  }

  function removeTask(id: string) {
    if (!confirm("Delete this task?")) return
    removeTaskAPI(id)
  }

  function toggleComplete(id: string) {
    toggleCompleteAPI(id)
  }

  const summary = useMemo(() => {
    const start = formatDateDisplay(startOfMonth(currentMonth))
    const end = formatDateDisplay(endOfMonth(currentMonth))
    const startDate = parseDisplayToDate(start)
    const endDate = parseDisplayToDate(end)
    const inMonth = tasks.filter((t) => {
      const dd = t.dueDate ? parseDisplayToDate(t.dueDate) : null
      return dd && dd >= startDate && dd <= endDate
    })
    const total = inMonth.length
    const completed = inMonth.filter((t) => t.completed).length
    return { total, completed }
  }, [tasks, currentMonth])

  return (
    <div className="p-6 text-black">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Monthly Summary</h2>
          <p className="text-sm text-black/70">{monthName(currentMonth)}</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="text-sm text-black/70">
            <div>
              Total: <strong>{summary.total}</strong>
            </div>
            <div>
              Completed: <strong>{summary.completed}</strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 bg-white/80 rounded shadow-sm"
              onClick={() => changeMonth(-1)}
            >
              Prev
            </button>
            <button
              className="px-3 py-1 bg-white/80 rounded shadow-sm"
              onClick={() => setCurrentMonth(startOfMonth(new Date()))}
            >
              Today
            </button>
            <button
              className="px-3 py-1 bg-white/80 rounded shadow-sm"
              onClick={() => changeMonth(1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="col-span-1 md:col-span-2 bg-[rgb(188,248,238)] p-4 rounded text-black">
          <div className="grid grid-cols-7 gap-2 text-center mb-2 text-sm text-black/80">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="font-medium">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysGrid.map((d) => {
              const display = formatDateDisplay(d)
              const inCurrentMonth = d.getMonth() === currentMonth.getMonth()
              const isToday = display === formatDateDisplay(new Date())
              const dateTasks = tasksForDueDate(display)
              return (
                <button
                  key={display}
                  onClick={() => {
                    setSelectedDate(display)
                    if (showForm) {
                      setEditing((prev) =>
                        prev
                          ? { ...prev, dueDate: display }
                          : ({ title: "", dueDate: display } as any),
                      )
                    }
                  }}
                  className={
                    "p-2 h-20 text-left rounded border " +
                    (inCurrentMonth
                      ? "bg-white/5"
                      : "bg-transparent text-black/30") +
                    (selectedDate === display
                      ? " ring-2 ring-indigo-300"
                      : "") +
                    (isToday ? " border-indigo-400" : "")
                  }
                >
                  <div className="flex justify-between items-start">
                    <div className="text-sm">{d.getDate()}</div>
                    {dateTasks.length > 0 && (
                      <div className="text-xs bg-indigo-600 text-white px-1 rounded">
                        {dateTasks.length}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs space-y-1 overflow-hidden h-12">
                    {dateTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className={
                          "truncate " +
                          (t.completed ? "line-through text-black/40" : "")
                        }
                      >
                        {t.title || "(no title)"}
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              className="px-3 py-1 bg-green-600 text-white rounded"
              onClick={() => onCreate(selectedDate)}
            >
              Create task for {selectedDate}
            </button>
          </div>
        </div>

        {/* Tasks list */}
        <div className="bg-[rgb(188,248,238)] p-4 rounded text-black">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Tasks — {selectedDate}</h3>
            <button
              className="px-2 py-1 bg-[#0DB19B] rounded text-black ml-3"
              onClick={() => onCreate(selectedDate)}
            >
              + New
            </button>
          </div>

          <div className="space-y-2">
            {tasksForDueDate(selectedDate).length === 0 && (
              <div className="text-sm text-black/50">
                No tasks for this date.
              </div>
            )}
            {tasksForDueDate(selectedDate)
              .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
              .map((t) => (
                <div
                  key={t.id}
                  className="p-2 bg-white/5 rounded flex justify-between items-start"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!t.completed}
                        onChange={() => toggleComplete(t.id)}
                      />
                      <div
                        className={
                          "font-medium " +
                          (t.completed ? "line-through text-black/40" : "")
                        }
                      >
                        {t.title || "(no title)"}
                      </div>
                    </div>
                    {t.notes && (
                      <div className="text-xs text-black/60 mt-1">
                        {t.notes}
                      </div>
                    )}
                    {t.dueDate && (
                      <div className="text-xs text-black/50 mt-1">
                        Due: {t.dueDate}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      className="text-sm px-2 py-1 bg-white/20 rounded"
                      onClick={() => {
                        setEditing(t)
                        setShowForm(true)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-sm px-2 py-1 bg-red-600 text-white rounded"
                      onClick={() => removeTask(t.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {showForm && (
            <div className="mt-4 p-3 bg-white/6 rounded border">
              <TaskForm
                initial={editing ?? { title: "", dueDate: selectedDate }}
                selectedDate={selectedDate}
                onCancel={() => {
                  setShowForm(false)
                  setEditing(null)
                }}
                onSave={(t) => saveTask(t)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TaskForm({
  initial,
  selectedDate,
  onSave,
  onCancel,
}: {
  initial: Partial<Task>
  selectedDate: string
  onSave: (t: Task) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial.title || "")
  const [notes, setNotes] = useState(initial.notes || "")
  const [dueDate, setDueDate] = useState(initial.dueDate || selectedDate)
  const [time, setTime] = useState(initial.dueTime || "")
  const [completed, setCompleted] = useState(!!initial.completed)
  //const id = (initial as Task).id || uid()
  //const createdDate = initial.createdDate!

  useEffect(() => {
    setDueDate(initial.dueDate ?? selectedDate)
  }, [selectedDate, initial.dueDate])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({
          ...(initial.id ? { id: initial.id } : {}),
          title: title.trim(),
          notes: notes.trim(),
          dueDate,
          dueTime: time,
          completed,
        } as any)
      }}
      className="space-y-2"
    >
      <div>
        <label className="text-sm block">Title</label>
        <input
          className="w-full rounded px-2 py-1 border border-black/45"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      {/* <div>
        <label className="text-sm block">Created Date</label>
        <input className="w-full rounded px-2 py-1 border border-black/45 bg-gray-100" value={createdDate} disabled />
      </div> */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm block">Due Date</label>
          <input
            type="date"
            className="w-full rounded px-2 py-1"
            value={dueDate ? dueDate.split("/").reverse().join("-") : ""}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split("-")
              setDueDate(`${d}/${m}/${y}`)
            }}
          />
        </div>
        <div>
          <label className="text-sm block">Time</label>
          <input
            type="time"
            className="w-full rounded px-2 py-1"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="text-sm block">Notes</label>
        <textarea
          className="w-full rounded px-2 py-1 border border-black/45"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
          />
          <span className="text-sm">Completed</span>
        </label>
        <div className="flex-1 text-right">
          <button
            type="button"
            className="px-3 py-1 mr-2 bg-white/20 rounded"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </form>
  )
}
