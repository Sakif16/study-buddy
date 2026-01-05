import { usePomodoro } from "../contexts/PomodoroContext"

export default function PomodoroWidget() {
  const {
    workMinutes,
    breakMinutes,
    setWorkMinutes,
    setBreakMinutes,
    isWork,
    isRunning,
    hasStarted,
    timeLeft,
    toggleStart,
    resetTimer,
    skipSession,
  } = usePomodoro()

  const formatTime = (seconds: number) => {
    const s = Math.max(0, seconds)
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0")
    const sec = (s % 60).toString().padStart(2, "0")
    return `${m}:${sec}`
  }

  const progressPercent = (() => {
    const total = (isWork ? workMinutes : breakMinutes) * 60
    return Math.min(100, Math.round(((total - Math.max(0, timeLeft)) / total) * 100))
  })()

  const timeColorClass = isRunning || !hasStarted ? "text-emerald-800" : "text-red-600"
  const barColorClass = isRunning ? "bg-emerald-700" : "bg-red-600"
  const startBtnClasses = "px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow"
  const resetBtnClasses = "px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white"

  return (
    <div className="flex justify-center mb-6">
      <div style={{ width: 'min(720px, 100%)' }}>
        <h3 className="text-2xl font-semibold text-slate-800 mb-4 text-center">Pomodoro Clock</h3>
        <div
          className="bg-white rounded-lg p-6 shadow-lg"
          style={{ height: "420px", boxSizing: "border-box", overflow: "hidden" }}
        >
          <div className="flex justify-between items-center mb-4">
            <span className="text-base text-slate-700">{isWork ? "Focus Session" : "Break"}</span>
          </div>

          <div className="text-center mb-4">
            <div className={`text-7xl md:text-8xl font-mono ${timeColorClass}`}>{formatTime(timeLeft)}</div>
            <div className="text-sm text-slate-600 mt-2">{progressPercent}%</div>
          </div>

          <div className="h-4 bg-gray-200 rounded overflow-hidden mb-4">
            <div className={`h-full ${barColorClass} shadow-inner`} style={{ width: `${progressPercent}%`, transition: "width 0.24s linear" }} />
          </div>

          <div className="flex gap-2 justify-center mb-4">
            <button onClick={() => void toggleStart()} className={startBtnClasses}>
              {isRunning ? "Pause" : "Start"}
            </button>
            <button onClick={resetTimer} className={resetBtnClasses}>
              Reset
            </button>
            <button onClick={skipSession} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
              Skip
            </button>
          </div>

          <div className="flex gap-6 justify-center items-center">
            <div className="flex items-center gap-3">
              <span className="text-slate-700 font-medium">Work</span>
              <button
                onClick={() => setWorkMinutes((m) => Math.max(1, m - 1))}
                className="px-3 py-1 bg-gray-100 text-slate-700 border border-gray-200 rounded-lg text-sm md:text-base shadow-sm"
                aria-label="Decrease work minutes"
              >
                -
              </button>
              <span className="w-10 text-center text-base font-medium">{workMinutes}m</span>
              <button
                onClick={() => setWorkMinutes((m) => Math.min(180, m + 1))}
                className="px-3 py-1 bg-gray-100 text-slate-700 border border-gray-200 rounded-lg text-sm md:text-base shadow-sm"
                aria-label="Increase work minutes"
              >
                +
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-700 font-medium">Break</span>
              <button
                onClick={() => setBreakMinutes((m) => Math.max(1, m - 1))}
                className="px-3 py-1 bg-gray-100 text-slate-700 border border-gray-200 rounded-lg text-sm md:text-base shadow-sm"
                aria-label="Decrease break minutes"
              >
                -
              </button>
              <span className="w-10 text-center text-base font-medium">{breakMinutes}m</span>
              <button
                onClick={() => setBreakMinutes((m) => Math.min(60, m + 1))}
                className="px-3 py-1 bg-gray-100 text-slate-700 border border-gray-200 rounded-lg text-sm md:text-base shadow-sm"
                aria-label="Increase break minutes"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
