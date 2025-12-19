// export default function Charts() {
//   return (
//     <div className="p-8 text-white">
//       <h2 className="text-2xl font-semibold text-white">Charts</h2>
//       <p className="text-white/90">(blank)</p>
//     </div>
//   )
// }

import { useEffect, useMemo, useState } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js"
import { Line, Bar, Pie } from "react-chartjs-2"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
)

type Task = {
  id: string
  title?: string
  dueDate?: string
  completed?: boolean
  userId?: string
}

// ---------------- helpers ----------------

function toISO(dateStr?: string): string {
  if (!dateStr) return ""
  if (dateStr.includes("/")) {
    const [d, m, y] = dateStr.split("/")
    return `${y}-${m}-${d}`
  }
  return dateStr
}

function isoToDisplay(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

function lastNDatesISO(n: number) {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
    )
  }
  return out
}

function lastSixMonths() {
  const keys: string[] = []
  const labels: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    labels.push(d.toLocaleString(undefined, { month: "short", year: "numeric" }))
  }
  return { keys, labels }
}

// ---------------- component ----------------

export default function Charts() {
  const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api"

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ac = new AbortController()
    async function load() {
      try {
        const res = await fetch(`${API}/tasks`, {
          credentials: "include",
          signal: ac.signal,
        })
        if (res.status === 401) {
          setTasks([])
          return
        }
        if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`)
        const data = await res.json()
        setTasks(data)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        console.error("chart fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => ac.abort()
  }, [API])

  const tasksWithISO = useMemo(
    () =>
      tasks.map((t) => ({
        ...t,
        iso: toISO(t.dueDate),
        monthKey: toISO(t.dueDate).slice(0, 7),
      })),
    [tasks],
  )

  if (loading) {
    return <div className="p-6 text-black">Loading charts…</div>
  }

  // -------- Pie --------
  const completed = tasksWithISO.filter((t) => t.completed).length
  const pending = tasksWithISO.length - completed

  const pieData = {
    labels: ["Completed", "Remaining"],
    datasets: [
      {
        data: [completed, pending],
        backgroundColor: ["#16A34A", "#F59E0B"],
      },
    ],
  }

  // -------- Bar --------
  const { keys, labels } = lastSixMonths()
  const barData = {
    labels,
    datasets: [
      {
        label: "% Completed",
        data: keys.map((k) => {
          const m = tasksWithISO.filter((t) => t.monthKey === k)
          if (!m.length) return 0
          return Math.round((m.filter((t) => t.completed).length / m.length) * 100)
        }),
        backgroundColor: "#2563EB",
      },
    ],
  }

  // -------- Line --------
  const last14 = lastNDatesISO(14)
  const cumulative: number[] = []
  last14.reduce((acc, iso, i) => {
    const next = acc + tasksWithISO.filter((t) => t.iso === iso && t.completed).length
    cumulative[i] = next
    return next
  }, 0)

  const lineData = {
    labels: last14.map(isoToDisplay),
    datasets: [
      {
        label: "Cumulative completed (14 days)",
        data: cumulative,
        borderColor: "#7C3AED",
        backgroundColor: "rgba(124,58,237,0.15)",
        fill: true,
        tension: 0.3,
      },
    ],
  }

  const options = {
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
  }

  return (
    <div className="p-6 text-black">
      <h2 className="text-2xl font-semibold mb-4">Study charts & statistics</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Completion</h3>
          <div style={{ height: 220 }}>
            <Pie data={pieData} options={options} />
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Progress (last 6 months)</h3>
          <div style={{ height: 260 }}>
            <Bar
              data={barData}
              options={{ ...options, scales: { y: { max: 100, beginAtZero: true } } }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Worm graph (last 14 days)</h3>
        <div style={{ height: 180 }}>
          <Line data={lineData} options={options} />
        </div>
      </div>
    </div>
  )
}