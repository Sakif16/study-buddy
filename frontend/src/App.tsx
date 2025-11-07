import { BrowserRouter, Routes, Route } from "react-router-dom"

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

function App() {
  return (
    <BrowserRouter>
      <div className="app-root min-h-screen bg-[#0DB19B] text-black flex flex-col">
        <Navbar />

        <main
          className="flex-1 my-6 mx-auto py-0 px-4"
          style={{ maxWidth: 1100 }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/wordle" element={<Wordle />} />
            <Route path="/streak" element={<Streak />} />
            <Route path="/motivation" element={<Motivation />} />
            <Route path="/group-study" element={<GroupStudy />} />
            <Route path="/ai-buddy" element={<AIBuddy />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/missed-tasks" element={<MissedTasks />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
