import { useContext, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { BACKEND_URL } from "../constants"
import AuthApi from "../AuthApi"
import { z } from "zod"

export default function Signup() {
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const apiAuth = useContext(AuthApi)
  const navigate = useNavigate()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // basic validation
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setError("")
    setFieldErrors({})

    const RegisterSchema = z.object({
      username: z.string().min(1, "Username is required"),
      email: z.string().email("Invalid email"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(20),
      name: z.string().max(20).nullable().optional(),
    })

    const parsed = RegisterSchema.safeParse({
      username,
      email,
      password,
      name: fullName || null,
    })

    if (!parsed.success) {
      const issues: Record<string, string> = {}
      parsed.error.issues.forEach((i) => {
        const key = Array.isArray(i.path) && i.path.length ? String(i.path[0]) : ""
        if (key) issues[key] = i.message
      })
      setFieldErrors(issues)
      return
    }

    ;(async () => {
      setSubmitting(true)
      try {
        const res = await fetch(`${BACKEND_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            username,
            email,
            password,
            name: fullName || null,
          }),
        })

        const data = await res.json()

        if (data.success) {
          apiAuth?.setAuth(true)
          if (data.user) apiAuth?.setUser(data.user)
          // broadcast initial stats so pages (eg. Streak) update immediately
          try {
            const stats = (data as any).stats
            const completed = (data as any).completedTasks
            if (stats || typeof completed === "number") {
              const totalMinutes = stats?.totalPomodoroMinutes ?? 0
              const totalHours = Math.floor(totalMinutes / 60)
              const totalSeconds = totalMinutes * 60
              window.dispatchEvent(
                new CustomEvent("pomodoro:updated", {
                  detail: {
                    currentStreak: stats?.currentStreak ?? 0,
                    totalHours,
                    totalSeconds,
                    completedTasks: typeof completed === "number" ? completed : undefined,
                  },
                }),
              )
            }
          } catch {
            // ignore
          }
          navigate("/")
        } else {
          if ((data as any)?.errors?.fieldErrors) {
            const issues: Record<string, string> = {}
            const fe = (data as any).errors.fieldErrors as Record<
              string,
              string[]
            >
            for (const k in fe) {
              issues[k] = Array.isArray(fe[k]) ? fe[k].join(" ") : String(fe[k])
            }
            setFieldErrors(issues)
          } else {
            let msg = "Registration failed"
            if ((data as any).message) msg = (data as any).message
            setError(msg)
          }
        }
      } catch (err: any) {
        console.error(err)
        setError(err?.message ?? "Registration failed")
      } finally {
        setSubmitting(false)
      }
    })()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0DB19B]">
      <div className="w-full max-w-md bg-white/80 rounded-lg p-8 shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/logo.png"
            alt="Study Buddy logo"
            className="w-20 h-20 object-contain mb-3"
          />
          <h1 className="text-2xl font-semibold text-black">Create account</h1>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col text-black">
            <span className="mb-1">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="px-3 py-2 rounded bg-gray-100 placeholder:text-gray-500 text-black outline-none focus:ring-2 focus:ring-[#1BECC9]"
              placeholder="Your full name"
              required
            />
          </label>

          <label className="flex flex-col text-black">
            <span className="mb-1">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-3 py-2 rounded bg-gray-100 placeholder:text-gray-500 text-black outline-none focus:ring-2 focus:ring-[#1BECC9]"
              placeholder="Choose a username"
              required
            />
            {fieldErrors.username && (
              <p className="text-sm text-red-600 mt-1">
                {fieldErrors.username}
              </p>
            )}
          </label>

          <label className="flex flex-col text-black">
            <span className="mb-1">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded bg-gray-100 placeholder:text-gray-500 text-black outline-none focus:ring-2 focus:ring-[#1BECC9]"
              placeholder="you@example.com"
              required
            />
            {fieldErrors.email && (
              <p className="text-sm text-red-600 mt-1">{fieldErrors.email}</p>
            )}
          </label>

          <label className="flex flex-col text-black">
            <span className="mb-1">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 rounded bg-gray-100 placeholder:text-gray-500 text-black outline-none focus:ring-2 focus:ring-[#1BECC9]"
              placeholder="Create a password"
              required
            />
            {fieldErrors.password && (
              <p className="text-sm text-red-600 mt-1">
                {fieldErrors.password}
              </p>
            )}
          </label>

          <label className="flex flex-col text-black">
            <span className="mb-1">Confirm password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="px-3 py-2 rounded bg-gray-100 placeholder:text-gray-500 text-black outline-none focus:ring-2 focus:ring-[#1BECC9]"
              placeholder="Repeat your password"
              required
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className={`mt-2 w-full px-4 py-2 bg-[#1BECC9] text-black font-semibold rounded hover:brightness-95 ${submitting ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {submitting ? "Signing up..." : "Sign up"}
          </button>

          <div className="mt-4 text-center text-gray-700">
            <span>Already have an account? </span>
            <Link to="/auth">
              <button className="ml-2 px-3 py-1 bg-transparent border border-gray-300 text-black rounded hover:bg-gray-100">
                Log in
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
