import React, { useEffect, useRef, useState } from "react";

export default function Motivation() {
  // Pomodoro settings (minutes)
  const [workMinutes, setWorkMinutes] = useState<number>(25);
  const [breakMinutes, setBreakMinutes] = useState<number>(5);

  // Timer state (seconds)
  const [isWork, setIsWork] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  // initialize timeLeft using a function (avoids linter/type warnings)
  const [timeLeft, setTimeLeft] = useState<number>(() => workMinutes * 60);

  // Quotes
  const quotes = useRef<string[]>([
    "Start where you are. Use what you have. Do what you can. — Arthur Ashe",
    "Don't watch the clock; do what it does. Keep going. — Sam Levenson",
    "Little by little, a little becomes a lot. — Tanzanian Proverb",
    "You don't have to be great to start, but you have to start to be great. — Zig Ziglar",
    "Discipline is choosing between what you want now and what you want most. — Abraham Lincoln",
    "Success is the sum of small efforts repeated day in and day out. — Robert Collier",
    "Take it easy but take it. — John Burroughs",
    "Focus on being productive instead of busy. — Tim Ferriss",
  ]);

  // compute initial quote value first (avoid inline initializer function)
  // ensure a string is produced even if tsconfig enables noUncheckedIndexedAccess
  const idx = quotes.current.length > 0 ? Math.floor(Math.random() * quotes.current.length) : 0;
  const initialQuote: string = quotes.current[idx] ?? quotes.current[0] ?? "";
  const [quote, setQuote] = useState<string>(initialQuote);

  // Interval ref - use the exact return type of window.setInterval to avoid lib conflicts
  const intervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);

  // Update timeLeft when durations or session type change
  useEffect(() => {
    setTimeLeft((prev) => {
      // If timer not running and session type changed via controls, reset to new duration
      if (!isRunning) {
        return (isWork ? workMinutes : breakMinutes) * 60;
      }
      // if running, keep current value
      return prev;
    });
  }, [workMinutes, breakMinutes, isWork, isRunning]);

  // Timer tick effect (clamp to 0 to avoid negative)
  useEffect(() => {
    if (isRunning) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((t) => Math.max(0, t - 1));
      }, 1000);
    } else {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  // Auto-switch sessions when time reaches zero (use functional update to avoid stale isWork)
  useEffect(() => {
    if (timeLeft !== 0) return;
    setIsWork((prev) => {
      const next = !prev;
      setTimeLeft(next ? workMinutes * 60 : breakMinutes * 60);
      return next;
    });
  }, [timeLeft, workMinutes, breakMinutes]);

  // Helpers
  const formatTime = (seconds: number) => {
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const toggleStart = () => setIsRunning((v) => !v);
  const resetTimer = () => {
    setIsRunning(false);
    setIsWork(true);
    setTimeLeft(workMinutes * 60);
  };

  // Skip session without using stale isWork value
  const skipSession = () => {
    setIsWork((prev) => {
      const next = !prev;
      setTimeLeft(next ? workMinutes * 60 : breakMinutes * 60);
      return next;
    });
  };

  const newQuote = () => {
    const idx = quotes.current.length > 0 ? Math.floor(Math.random() * quotes.current.length) : 0;
    const q: string = quotes.current[idx] ?? quotes.current[0] ?? "";
    setQuote(q);
  };

  const progressPercent = (() => {
    const total = (isWork ? workMinutes : breakMinutes) * 60;
    return Math.min(100, Math.round(((total - Math.max(0, timeLeft)) / total) * 100));
  })();

  return (
    <div className="p-6 max-w-md mx-auto text-white">
      <h2 className="text-2xl font-semibold mb-4">Motivation & Pomodoro</h2>

      {/* Timer Card */}
      <div className="bg-white/5 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-white/80">{isWork ? "Focus Session" : "Break"}</span>
          <span className="text-sm text-white/60">{isRunning ? "Running" : "Paused"}</span>
        </div>

        <div className="text-center mb-3">
          <div className="text-5xl font-mono">{formatTime(timeLeft)}</div>
          <div className="text-sm text-white/70 mt-1">{progressPercent}%</div>
        </div>

        <div className="h-2 bg-white/10 rounded overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-400"
            style={{ width: `${progressPercent}%`, transition: "width 0.3s linear" }}
          />
        </div>

        <div className="flex gap-2 justify-center mb-3">
          <button
            onClick={toggleStart}
            className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600"
          >
            {isRunning ? "Pause" : "Start"}
          </button>
          <button onClick={resetTimer} className="px-3 py-1 rounded bg-zinc-600 hover:bg-zinc-700">
            Reset
          </button>
          <button onClick={skipSession} className="px-3 py-1 rounded bg-indigo-500 hover:bg-indigo-600">
            Skip
          </button>
        </div>

        {/* Duration controls */}
        <div className="flex gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <span className="text-white/80">Work</span>
            <button
              onClick={() => setWorkMinutes((m) => Math.max(1, m - 1))}
              className="px-2 py-0.5 bg-zinc-700 rounded"
            >
              -
            </button>
            <span className="w-8 text-center">{workMinutes}m</span>
            <button
              onClick={() => setWorkMinutes((m) => Math.min(180, m + 1))}
              className="px-2 py-0.5 bg-zinc-700 rounded"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white/80">Break</span>
            <button
              onClick={() => setBreakMinutes((m) => Math.max(1, m - 1))}
              className="px-2 py-0.5 bg-zinc-700 rounded"
            >
              -
            </button>
            <span className="w-8 text-center">{breakMinutes}m</span>
            <button
              onClick={() => setBreakMinutes((m) => Math.min(60, m + 1))}
              className="px-2 py-0.5 bg-zinc-700 rounded"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Quote Card */}
      <div className="bg-white/5 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-2">Motivational Quote</h3>
        <p className="text-white/90 italic mb-3">"{quote}"</p>
        <div className="flex gap-2">
          <button onClick={newQuote} className="px-3 py-1 rounded bg-blue-500 hover:bg-blue-600">
            New Quote
          </button>
          <button
            onClick={() => {
              // guard clipboard at runtime (some TS configs/libraries need this)
              if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                navigator.clipboard.writeText(quote);
              }
            }}
            className="px-3 py-1 rounded bg-zinc-600 hover:bg-zinc-700"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}


