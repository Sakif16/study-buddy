import "dotenv/config"
// use global fetch (Node 18+)

type ReqOpts = {
  method?: string
  headers?: Record<string, string>
  body?: unknown
}

const BASE = "http://localhost:3000"

async function main() {
  // create a unique username to avoid conflicts
  const username = `wordletest${Date.now()}`
  const password = "password123"

  // register (also logs in)
  console.log("Registering user", username)
  let res = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      email: `${username}@example.com`,
      password,
    }),
  })
  let json = await res.json()
  console.log("register response", json)
  const cookie = res.headers.get("set-cookie")
  if (!cookie) throw new Error("no session cookie after register")

  // helper to call with cookie
  const call = async (path: string, opts: ReqOpts = {}) => {
    const init: RequestInit = {
      credentials: "include",
      method: opts.method || "GET",
    }
    init.headers = { cookie, ...(opts.headers || {}) }
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body)
    const r = await fetch(`${BASE}${path}`, init)
    const j = await r.json().catch(() => null)
    return { status: r.status, json: j, headers: r.headers }
  }

  console.log("GET /api/wordle/target (initial)")
  let r = await call("/api/wordle/target")
  console.log(r.status, r.json)

  console.log("POST /api/wordle/finish (increment)")
  r = await call("/api/wordle/finish", { method: "POST" })
  console.log(r.status, r.json)

  console.log("GET /api/wordle/target (after finish)")
  r = await call("/api/wordle/target")
  console.log(r.status, r.json)

  console.log("Logging out")
  r = await call("/logout", { method: "GET" })
  console.log(r.status, r.json)

  console.log("Re-login")
  res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
  json = await res.json()
  console.log("login response", json)
  const cookie2 = res.headers.get("set-cookie")
  if (!cookie2) throw new Error("no session cookie after login")

  const call2 = async (path: string, opts: ReqOpts = {}) => {
    const init: RequestInit = {
      credentials: "include",
      method: opts.method || "GET",
    }
    init.headers = { cookie: cookie2, ...(opts.headers || {}) }
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body)
    const r = await fetch(`${BASE}${path}`, init)
    const j = await r.json().catch(() => null)
    return { status: r.status, json: j, headers: r.headers }
  }

  console.log("GET /api/wordle/target (after re-login)")
  r = await call2("/api/wordle/target")
  console.log(r.status, r.json)

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
