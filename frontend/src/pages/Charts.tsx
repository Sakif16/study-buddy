// export default function Charts() {
//   return (
//     <div className="p-8 text-white">
//       <h2 className="text-2xl font-semibold text-white">Charts</h2>
//       <p className="text-white/90">(blank)</p>
//     </div>
//   )
// }

import {useMemo} from "react"
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
}

const STORAGE_KEY = "study-buddy.tasks.v2"


function toISO(dateStr?: string): string {
  if (!dateStr) return ""
  dateStr = dateStr.trim()
  if (dateStr.includes("-")) {
    const parts = dateStr.split("-")
    const yearCandidate = typeof parts[0] === "string" ? parts[0].trim() : ""
    // ensure parts[0] exists, we have at least 3 segments, and the first segment is a 4-digit year
    if (parts.length >= 3 && yearCandidate.length === 4 && /^\d{4}$/.test(yearCandidate)) {
      return dateStr
    }
  }

  if (dateStr.includes("/")) {
    const [day = "", month = "", year = ""] = dateStr.split("/").map((x) => x.trim())
    if (day && month && year) {
      return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
  }
  
  const parseDate = new Date(dateStr)
  if (Number.isNaN(parseDate.getTime())) return ""
  return `${parseDate.getFullYear()}-${String(parseDate.getMonth() + 1).padStart(2, "0")}-${String(
    parseDate.getDate()
  ).padStart(2, "0")}`
}

function isoToDisplay(iso: string) {
  if (!iso) return ""
  const p = iso.split("-")
  if (p.length !== 3) return iso
  return `${p[2]}/${p[1]}/${p[0]}`
}

function lastNDatesISO(n: number) {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)
  }
  return out
}

function lastSixMonths() {
  const outKey: string[] = []
  const outLabel: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` // YYYY-MM
    const label = d.toLocaleString(undefined, { month: "short", year: "numeric" })
    outKey.push(key)
    outLabel.push(label)
  }
  return { keys: outKey, labels: outLabel }
}

export default function Charts() {
  const tasks: Task[] = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    } catch {
      return []
    }
  }, [])

  // normalize task dates to ISO for counting
  const tasksWithISO = useMemo(
    () =>
      tasks.map((t) => ({
        ...t,
        _iso: toISO(t.dueDate),
        _monthKey: toISO(t.dueDate).slice(0, 7), 
      })),
    [tasks]
  )

  // Pie: completed vs remaining
  const completedCount = tasksWithISO.filter((t) => t.completed).length
  const pendingCount = tasksWithISO.length - completedCount
  const pieData = {
    labels: ["Completed", "Remaining"],
    datasets: [
      {
        data: [completedCount, pendingCount],
        backgroundColor: ["#00BF00", "#F59E0B"],
        borderColor: ["#00BF00", "#E39A06"],
        borderWidth: 1,
      },
    ],
  }

  // Bar: percent completed for last 6 months
  const { keys: monthKeys, labels: monthLabels } = lastSixMonths()
  const barData = useMemo(() => {
    const values = monthKeys.map((key) => {
      const monthTasks = tasksWithISO.filter((t) => t._monthKey === key)
      if (monthTasks.length === 0) return 0
      const comp = monthTasks.filter((t) => t.completed).length
      return Math.round((comp / monthTasks.length) * 100)
    })
    return {
      labels: monthLabels,
      datasets: [
        {
          label: "% Completed",
          data: values,
          backgroundColor: "#2563EB",
        },
      ],
    }
  }, [tasksWithISO, monthKeys, monthLabels])

  // Worm graph (cumulative completed) last 14 days
  const last14 = lastNDatesISO(14)
  const wormData = useMemo(() => {
    const daily = last14.map((iso) => tasksWithISO.filter((t) => t._iso === iso && t.completed).length)
    const cum: number[] = []
    daily.reduce((acc, cur, i) => {
      const next = acc + cur
      cum[i] = next
      return next
    }, 0)
    return {
      labels: last14.map(isoToDisplay),
      datasets: [
        {
          label: "Cumulative completed (14d)",
          data: cum,
          borderColor: "#7C3AED",
          backgroundColor: "rgba(124,58,237,0.12)",
          tension: 0.3,
          fill: true,
          pointRadius: 3,
        },
      ],
    }
  }, [tasksWithISO, last14])

  const commonOptions = {
    plugins: {
      legend: { display: true, position: "top" as const },
      tooltip: { mode: "index" as const, intersect: false },
    },
    maintainAspectRatio: false,
  }

  return (
    <div className="p-6 text-black">
      <h2 className="text-2xl font-semibold mb-4">Study charts & statistics</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Completion</h3>
          <div style={{ height: 220 }}>
            <Pie data={pieData} options={{ ...commonOptions, maintainAspectRatio: false }} />
          </div>
          <div className="mt-3 text-sm">
            <div>Completed: <strong>{completedCount}</strong></div>
            <div>Remaining: <strong>{pendingCount}</strong></div>
            <div>Total tasks: <strong>{tasksWithISO.length}</strong></div>
          </div>
        </div>

        <div className="col-span-1 md:col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Progress (last 6 months)</h3>
          <div style={{ height: 260 }}>
            <Bar data={barData} options={{ ...commonOptions, scales: { y: { beginAtZero: true, max: 100 } } }} />
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Worm graph — last 14 days (cumulative)</h3>
        <div style={{ height: 180 }}>
          <Line data={wormData} options={{ ...commonOptions, scales: { y: { beginAtZero: true } } }} />
        </div>
      </div>
    </div>
  )
}
