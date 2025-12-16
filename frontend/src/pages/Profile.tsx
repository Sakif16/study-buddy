import { useContext, useState } from "react"
import { useNavigate } from "react-router-dom"
import AuthApi from "../AuthApi"
import { BACKEND_URL } from "../constants"
import { z } from "zod"

export default function Profile() {
  const authApi = useContext(AuthApi)
  const navigate = useNavigate()

  const initialUsername = authApi?.user?.username ?? ""

  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const onCancel = () => {
    // reset local inputs and go back to home
    setUsername(initialUsername)
    setPassword("")
    setConfirmPassword("")
    setError("")
    setFieldErrors({})
    navigate("/")
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setFieldErrors({})

    // zod schema: username required; password optional but when present has length rules
    const ProfileSchema = z.object({
      username: z.string().min(1, "Username is required"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(20)
        .optional(),
    })

    // ensure passwords match if provided
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        setFieldErrors({ password: "Passwords do not match" })
        return
      }
    }

    const parsed = ProfileSchema.safeParse({
      username,
      password: password || undefined,
    })
    if (!parsed.success) {
      const issues: Record<string, string> = {}
      parsed.error.issues.forEach((i) => {
        const p = i.path?.[0]
        if (p) issues[p.toString()] = i.message
      })
      setFieldErrors(issues)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${BACKEND_URL}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password: password || undefined }),
      })

      if (res.status === 404) {
        // endpoint not implemented on backend yet
        setError("Profile update endpoint not available on server")
        return
      }

      const data = await res.json()

      if (data.success) {
        // update local context with new username (server should return user)
        if (data.user) authApi?.setUser(data.user)
        // clear sensitive fields
        setPassword("")
        setConfirmPassword("")
        // navigate back or show success (we'll navigate home)
        navigate("/")
      } else {
        if ((data as any)?.errors?.fieldErrors) {
          const fe = (data as any).errors.fieldErrors as Record<
            string,
            string[]
          >
          const issues: Record<string, string> = {}
          for (const k in fe)
            issues[k] = Array.isArray(fe[k]) ? fe[k].join(" ") : String(fe[k])
          setFieldErrors(issues)
        } else {
          setError((data as any).message ?? "Update failed")
        }
      }
    } catch (err: any) {
      console.error("profile update error", err)
      setError(err?.message ?? "Update failed")
    } finally {
      setSubmitting(false)
    }
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
          <h1 className="text-2xl font-semibold text-black">Edit Profile</h1>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col text-black">
            <span className="mb-1">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-3 py-2 rounded bg-gray-100 placeholder:text-gray-500 text-black outline-none focus:ring-2 focus:ring-[#1BECC9]"
              placeholder="Username"
              required
            />
            {fieldErrors.username && (
              <p className="text-sm text-red-600 mt-1">
                {fieldErrors.username}
              </p>
            )}
          </label>

          <label className="flex flex-col text-black">
            <span className="mb-1">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 rounded bg-gray-100 placeholder:text-gray-500 text-black outline-none focus:ring-2 focus:ring-[#1BECC9]"
              placeholder="Leave blank for current"
            />
            {fieldErrors.password && (
              <p className="text-sm text-red-600 mt-1">
                {fieldErrors.password}
              </p>
            )}
          </label>

          <label className="flex flex-col text-black">
            <span className="mb-1">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="px-3 py-2 rounded bg-gray-100 placeholder:text-gray-500 text-black outline-none focus:ring-2 focus:ring-[#1BECC9]"
              placeholder="Repeat new password"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 px-4 py-2 bg-[#1BECC9] text-black font-semibold rounded ${submitting ? "opacity-60 cursor-not-allowed" : "hover:brightness-95"}`}
            >
              {submitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
