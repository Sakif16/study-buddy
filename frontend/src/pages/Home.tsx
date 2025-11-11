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
  date: string // YYYY-MM-DD
  completed?: boolean
  dueTime?: string
}

const STORAGE_KEY = "study-buddy.tasks.v1"

function uid() {
  return Math.random().toString(36).slice(2, 9)
}


function formatDateISO(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
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

// display helper: convert YYYY-MM-DD to DD-MM-YYYY (also leaves DD-MM-YYYY unchanged)
function formatDisplayFromISO(dateStr: string) {
  const parts = dateStr.split("-")
  if (parts.length !== 3) return dateStr
  // if ISO (YYYY-MM-DD)
  if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`
  // already DD-MM-YYYY
  return dateStr
}

export default function Home() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateISO(new Date()))
  const [tasks, setTasks] = useState<Task[]>([])
  const [editing, setEditing] = useState<Task | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setTasks(JSON.parse(raw))
    } catch { }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
    } catch { }
  }, [tasks])

  const daysGrid = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const firstWeekDay = start.getDay() // 0 (Sun) - 6 (Sat)
    const cells: Date[] = []

    // backfill previous month days
    for (let i = firstWeekDay - 1; i >= 0; i--) {
      const d = new Date(start)
      d.setDate(start.getDate() - (i + 1))
      cells.push(d)
    }

    // current month
    for (let d = 1; d <= end.getDate(); d++) {
      cells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))
    }

    // fill to full weeks (42 cells max)
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1]
      const n = new Date(last)
      n.setDate(last.getDate() + 1)
      cells.push(n)
    }

    return cells
  }, [currentMonth])

  function tasksForDate(dateISO: string) {
    return tasks.filter((t) => t.date === dateISO)
  }

  function changeMonth(offset: number) {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + offset)
    setCurrentMonth(startOfMonth(d))
    setSelectedDate(formatDateISO(startOfMonth(d)))
  }

  function onCreate(dateISO: string) {
    setEditing({ id: uid(), title: "", date: dateISO })
    setShowForm(true)
  }

  function saveTask(t: Task) {
    setTasks((prev) => {
      const exists = prev.find((p) => p.id === t.id)
      if (exists) {
        return prev.map((p) => (p.id === t.id ? t : p))
      } else {
        return [...prev, t]
      }
    })
    setShowForm(false)
    setEditing(null)
  }

  function removeTask(id: string) {
    if (!confirm("Delete this task?")) return
    setTasks((prev) => prev.filter((p) => p.id !== id))
  }

  function toggleComplete(id: string) {
    setTasks((prev) => prev.map((p) => (p.id === id ? { ...p, completed: !p.completed } : p)))
  }

  // Monthly summary
  const summary = useMemo(() => {
    const start = formatDateISO(startOfMonth(currentMonth))
    const end = formatDateISO(endOfMonth(currentMonth))
    const inMonth = tasks.filter((t) => t.date >= start && t.date <= end)
    const total = inMonth.length
    const completed = inMonth.filter((t) => t.completed).length
    const overdue = inMonth.filter((t) => !t.completed && t.date < formatDateISO(new Date())).length
    return { total, completed, overdue }
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
            <div>Total: <strong>{summary.total}</strong></div>
            <div>Completed: <strong>{summary.completed}</strong></div>
            <div>Overdue: <strong>{summary.overdue}</strong></div>
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
              <div key={d} className="font-medium">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysGrid.map((d) => {
              const iso = formatDateISO(d)
              const inCurrentMonth = d.getMonth() === currentMonth.getMonth()
              const isToday = iso === formatDateISO(new Date())
              const dateTasks = tasksForDate(iso)
              return (
                <button
                  key={iso}
                  onClick={() => {
                    setSelectedDate(iso)
                  }}
                  className={
                    "p-2 h-20 text-left rounded border " +
                    (inCurrentMonth ? "bg-white/5" : "bg-transparent text-black/30") +
                    (selectedDate === iso ? " ring-2 ring-indigo-300" : "") +
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
                        className={"truncate " + (t.completed ? "line-through text-black/40" : "")}
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
              {/* Create task on {selectedDate} */}
              Create task on {formatDisplayFromISO(selectedDate)}
            </button>
          </div>
        </div>

        {/* Tasks list / editor */}
        <div className="bg-[rgb(188,248,238)] p-4 rounded text-black">
          <div className="flex items-center justify-between mb-2">
            {/* <h3 className="font-semibold">Tasks — {selectedDate}</h3> */}
            <h3 className="font-semibold">Tasks — {formatDisplayFromISO(selectedDate)}</h3>
            <button
              className="px-2 py-1 bg-[#0DB19B] rounded text-black ml-3"
              onClick={() => onCreate(formatDisplayFromISO(selectedDate))}>
              + New
            </button>
          </div>

          <div className="space-y-2">
            {tasksForDate(formatDisplayFromISO(selectedDate)).length === 0 && (
              <div className="text-sm text-black/50">No tasks for this date.</div>
            )}

            {tasksForDate(formatDisplayFromISO(selectedDate))
              .sort((a, b) => (a.dueTime || "").localeCompare(b.dueTime || ""))
              .map((t) => (
                <div key={t.id} className="p-2 bg-white/5 rounded flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!t.completed} onChange={() => toggleComplete(t.id)} />
                      <div className={"font-medium " + (t.completed ? "line-through text-black/40" : "")}>
                        {t.title || "(no title)"}
                      </div>
                    </div>
                    {t.notes && <div className="text-xs text-black/60 mt-1">{t.notes}</div>}
                    {t.dueTime && <div className="text-xs text-black/50 mt-1">Time: {t.dueTime}</div>}
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

          {/* Inline form */}
          {showForm && (
            <div className="mt-4 p-3 bg-white/6 rounded border">
              <TaskForm
                initial={editing ?? { id: uid(), title: "", date: formatDisplayFromISO(selectedDate) }}
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

/* Simple TaskForm component */
function TaskForm({ initial, onSave, onCancel }: { initial: Partial<Task>; onSave: (t: Task) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(initial.title || "")
  const [notes, setNotes] = useState(initial.notes || "")
  const [date, setDate] = useState(initial.date || formatDateISO(new Date()))
  const [time, setTime] = useState(initial.dueTime || "")
  const [completed, setCompleted] = useState(!!initial.completed)
  const id = (initial as Task).id || uid()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ id, title: title.trim(), notes: notes.trim(), date, dueTime: time, completed })
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
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm block">Date</label>
          <input type="date" lang="en-GB" className="w-full rounded px-2 py-1" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm block">Time</label>
          <input type="time" className="w-full rounded px-2 py-1" value={time} onChange={(e) => setTime(e.target.value)} />
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
          <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} />
          <span className="text-sm">Completed</span>
        </label>
        <div className="flex-1 text-right">
          <button type="button" className="px-3 py-1 mr-2 bg-white/20 rounded" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">
            Save
          </button>
        </div>
      </div>
    </form>
  )
}