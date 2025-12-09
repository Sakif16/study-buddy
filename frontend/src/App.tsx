import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Outlet,
  Navigate,
  useNavigate,
} from "react-router-dom"

import Navbar from "./components/Navbar"
import Footer from "./components/Footer"

import Home from "./pages/Home"
import Assignments from "./pages/Assignments"
import Wordle from "./pages/Wordle"
import Streak from "./pages/Streak"
import Motivation from "./pages/Motivation"
import GroupStudy from "./pages/GroupStudy"
import AIBuddy from "./pages/AIBuddy"
import Charts from "./pages/Charts"
import Notes from "./pages/Notes"
import MissedTasks from "./pages/MissedTasks"
import Auth from "./pages/Auth"
import Signup from "./pages/Signup"
import { useContext, useEffect, useState } from "react"
import AuthApi from "./AuthApi"
import { BACKEND_URL } from "./constants"

function AppContent() {
  const [auth, setAuth] = useState(false)

  useEffect(function readSession() {
    const controller = new AbortController()

    const load = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/auth`, {
          signal: controller.signal,
          credentials: "include",
        })
        const { status } = (await res.json()) as { status: boolean }
        setAuth(status)
        console.log(`read-session status is ${status}`)
      } catch (error) {
        console.log(error)
      }
    }

    load()
    return () => controller.abort("cancel on re-render")
  }, [])

  const location = useLocation()
  const hideNavbar =
    location.pathname === "/auth" || location.pathname === "/signup"

  return (
    <div className="app-root min-h-screen bg-[#0DB19B] text-black flex flex-col">
      {!hideNavbar && <Navbar />}

      <main
        className="flex-1 my-6 mx-auto py-0 px-4"
        style={{ maxWidth: 1100 }}
      >
        <AuthApi value={{ auth, setAuth }}>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<Signup />} />
            <Route element={<ProtectedRoutes />}>
              <Route path="/" element={<Home />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/wordle" element={<Wordle />} />
              <Route path="/streak" element={<Streak />} />
              <Route path="/motivation" element={<Motivation />} />
              <Route path="/group-study" element={<GroupStudy />} />
              <Route path="/ai-buddy" element={<AIBuddy />} />
              <Route path="/charts" element={<Charts />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/missed-tasks" element={<MissedTasks />} />
            </Route>
          </Routes>
        </AuthApi>
      </main>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

// what in the black magic (thank you chatgpt for being quick and helpful for once)
function ProtectedRoutes() {
  const authApi = useContext(AuthApi)
  return authApi?.auth ? <Outlet /> : <Navigate to="/auth" replace={true} />
}

function Logout() {
  const navigate = useNavigate()

  useEffect(() => {
    const logout = async () => {
      try {
        await fetch(`${BACKEND_URL}/logout`)
      } catch (err) {
        console.error("logout failed?", err)
      } finally {
        navigate("/auth")
      }
    }

    logout()
  }, [navigate])

  return null
}

export default App
