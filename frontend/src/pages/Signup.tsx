import { useState } from "react"
import { Link } from "react-router-dom"

export default function Signup() {
  const [fullName, setFullName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // basic validation
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setError("")
    // Replace with real signup logic later
    console.log("Signup submitted", { fullName, username, email, password })
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
            className="mt-2 w-full px-4 py-2 bg-[#1BECC9] text-black font-semibold rounded hover:brightness-95"
          >
            Sign up
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
