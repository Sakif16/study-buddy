import { useContext, useEffect, useRef, useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import AuthApi from "../AuthApi"
import { BACKEND_URL } from "../constants"

const defaultLinks = [
  { to: "/", label: "Home" },
  { to: "/motivation", label: "Study" },
  { to: "/assignments", label: "Assignments" },
  { to: "/notes", label: "Notes" },
  { to: "/group-study", label: "Group Study" },
  { to: "/charts", label: "Charts" },
  { to: "/streak", label: "Streak" },
  { to: "/missed-tasks", label: "Missed Tasks" },
  { to: "/wordle", label: "Wordle" },
  { to: "/ai-buddy", label: "Ai Buddy" },
]

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/admin/feedbacks", label: "User Feedbacks" },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const authApi = useContext(AuthApi)
  const navigate = useNavigate()
  // username from auth context (fallback to design placeholder)
  const username = authApi?.user?.username ?? "Sakif"

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/logout`, { credentials: "include" })
    } catch (err) {
      console.error("logout failed", err)
    } finally {
      authApi?.setAuth(false)
      authApi?.setAdmin?.(false)
      authApi?.setUser(null)
      setUserOpen(false)
      setOpen(false)
      navigate("/auth")
    }
  }

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!userMenuRef.current) return
      if (!userMenuRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserOpen(false)
    }

    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  return (
    <header className="bg-[#DAF9EF] text-black relative">
      <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Study Buddy logo"
            className="w-12 h-12 object-contain"
          />
          <span className="font-semibold text-lg">Study Buddy</span>
        </div>

        {/* Desktop nav: horizontally scrollable to accommodate many items */}
        <nav className="hidden md:flex items-center gap-2 overflow-x-auto">
          {(authApi?.admin ? adminLinks : defaultLinks).map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }: { isActive: boolean }) =>
                `px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors text-black ${
                  isActive ? "bg-[#1BECC9] font-medium" : "hover:bg-[#1BECC9]"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* User menu (desktop) */}
        <div ref={userMenuRef} className="hidden md:flex items-center relative">
          <button
            onClick={() => setUserOpen((s) => !s)}
            className="flex items-center gap-2 px-3 py-1 rounded hover:bg-black/5"
            aria-haspopup="true"
            aria-expanded={userOpen}
          >
            <div className="w-8 h-8 rounded-full bg-[#1BECC9] flex items-center justify-center font-bold text-black">
              {(username.charAt(0) || "?").toUpperCase()}
            </div>
            <span className="text-sm font-medium">{username}</span>
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg text-black z-20">
              <button
                onClick={() => {
                  setUserOpen(false)
                  navigate("/profile")
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Edit profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setOpen((s) => !s)}
            aria-label="Toggle menu"
            className="p-2 rounded-md hover:bg-black/10"
          >
            <span
              className={`block w-6 h-0.5 bg-black transition-transform ${open ? "-translate-y-1 rotate-45" : ""}`}
            />
            <span
              className={`block w-6 h-0.5 bg-black my-1 transition-opacity ${open ? "opacity-0" : "opacity-100"}`}
            />
            <span
              className={`block w-6 h-0.5 bg-black transition-transform ${open ? "translate-y-1 -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {open && (
        <div className="md:hidden bg-[#DAF9EF]/95">
          <div className="px-4 pb-4 pt-2 flex flex-col gap-1">
            {(authApi?.admin ? adminLinks : defaultLinks).map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }: { isActive: boolean }) =>
                  `block px-3 py-2 rounded-md text-sm whitespace-nowrap text-black ${
                    isActive ? "bg-[#1BECC9] font-medium" : "hover:bg-[#1BECC9]"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <div className="mt-2 border-t border-black/10 pt-2">
              <div className="px-3 py-2 text-sm text-black font-medium">
                {username}
              </div>
              <NavLink
                to="/profile"
                className="block px-3 py-2 text-sm text-black hover:bg-black/5"
              >
                Edit profile
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 hover:bg-black/5"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
