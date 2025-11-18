import { useState } from "react"
import { Link } from "react-router-dom"

export default function Auth() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Replace with real auth logic later
    console.log("Login submitted", { username, password })
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
          <h1 className="text-2xl font-semibold text-black">Study Buddy</h1>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col text-black">
            <span className="mb-1">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-3 py-2 rounded bg-gray-100 placeholder:text-gray-500 text-black outline-none focus:ring-2 focus:ring-[#1BECC9]"
              placeholder="Enter username"
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
              placeholder="Enter password"
              required
            />
          </label>

          <button
            type="submit"
            className="mt-2 w-full px-4 py-2 bg-[#1BECC9] text-black font-semibold rounded hover:brightness-95"
          >
            Login
          </button>

          <div className="mt-4 text-center text-gray-700">
            <span>Don't have an account? </span>
            <Link to="/signup">
              <button className="ml-2 px-3 py-1 bg-transparent border border-gray-300 text-black rounded hover:bg-gray-100">
                Sign up
              </button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
