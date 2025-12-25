export async function startPomodoro(type: "work" | "break" = "work") {
  const res = await fetch("http://localhost:3000/api/pomodoro/start", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  })
  if (!res.ok) throw new Error("failed to start pomodoro")
  return res.json()
}

export async function stopPomodoro(sessionId: string) {
  const res = await fetch("http://localhost:3000/api/pomodoro/stop", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  })
  if (!res.ok) throw new Error("failed to stop pomodoro")
  return res.json()
}

export async function listPomodoros() {
  const res = await fetch("http://localhost:3000/api/pomodoro/sessions", {
    credentials: "include",
  })
  if (!res.ok) throw new Error("failed to list sessions")
  return res.json()
}

export async function getPomodoroTotals() {
  const res = await fetch("http://localhost:3000/api/pomodoro/totals", {
    credentials: "include",
  })
  if (!res.ok) throw new Error("failed to get totals")
  return res.json()
}

export async function getPomodoroStats() {
  const tzOffset = new Date().getTimezoneOffset()
  const res = await fetch(`http://localhost:3000/api/pomodoro/stats?tzOffsetMinutes=${tzOffset}`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error("failed to get stats")
  return res.json()
}

export async function getStreak() {
  const res = await fetch("http://localhost:3000/api/streak", {
    credentials: "include",
  })
  if (!res.ok) throw new Error("failed to get streak")
  return res.json()
}

export async function getTasks() {
  const res = await fetch("http://localhost:3000/api/tasks", {
    credentials: "include",
  })
  if (!res.ok) throw new Error("failed to get tasks")
  return res.json()
}
