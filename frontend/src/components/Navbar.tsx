import { useState } from "react"
import { NavLink } from "react-router-dom"

const links = [
  { to: "/", label: "Home" },
  { to: "/assignments", label: "Assignments" },
  { to: "/wordle", label: "Wordle" },
  { to: "/streak", label: "Streak" },
  { to: "/motivation", label: "Motivation" },
  { to: "/group-study", label: "Group Study" },
  { to: "/ai-buddy", label: "A.I Buddy" },
  { to: "/charts", label: "Charts" },
  { to: "/notes", label: "Notes" },
  { to: "/missed-tasks", label: "Missed Tasks" },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-[#00cc90] text-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/vite.svg" alt="logo" className="w-9 h-9" />
          <span className="font-semibold text-lg">Study Buddy</span>
        </div>

        {/* Desktop nav: horizontally scrollable to accommodate many items */}
        <nav className="hidden md:flex items-center gap-2 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-white/20 text-white font-medium"
                    : "hover:bg-white/10"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}

          {/* example CTA button (using the yellow color) - keep subtle and accessible */}
          <NavLink
            to="/ai-buddy"
            className="ml-3 hidden md:inline-block bg-[#f5e70b] text-slate-900 px-3 py-2 rounded-md font-semibold hover:brightness-95"
          >
            A.I Buddy
          </NavLink>
        </nav>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setOpen((s) => !s)}
            aria-label="Toggle menu"
            className="p-2 rounded-md hover:bg-white/10"
          >
            <span
              className={`block w-6 h-0.5 bg-white transition-transform ${open ? "-translate-y-1 rotate-45" : ""}`}
            />
            <span
              className={`block w-6 h-0.5 bg-white my-1 transition-opacity ${open ? "opacity-0" : "opacity-100"}`}
            />
            <span
              className={`block w-6 h-0.5 bg-white transition-transform ${open ? "translate-y-1 -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {open && (
        <div className="md:hidden bg-[#00cc90]/95">
          <div className="px-4 pb-4 pt-2 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-sm whitespace-nowrap ${
                    isActive
                      ? "bg-white/20 text-white font-medium"
                      : "hover:bg-white/10 text-white"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}

            <NavLink
              to="/ai-buddy"
              onClick={() => setOpen(false)}
              className="mt-2 inline-block bg-[#f5e70b] text-slate-900 px-3 py-2 rounded-md font-semibold"
            >
              A.I Buddy
            </NavLink>
          </div>
        </div>
      )}
    </header>
  )
}
