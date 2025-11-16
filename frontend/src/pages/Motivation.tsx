import { useEffect, useRef, useState } from "react";

export default function Motivation() {
	// Pomodoro settings (minutes)
	const [workMinutes, setWorkMinutes] = useState<number>(25);
	const [breakMinutes, setBreakMinutes] = useState<number>(5);

	// Timer state (seconds)
	const [isWork, setIsWork] = useState<boolean>(true);
	const [isRunning, setIsRunning] = useState<boolean>(false);
	// track whether user has started the timer at least once
	const [hasStarted, setHasStarted] = useState<boolean>(false);
	// initialize timeLeft using a function (avoids linter/type warnings)
	const [timeLeft, setTimeLeft] = useState<number>(() => workMinutes * 60);

	// Quotes (short, single-line)
	const quotes = useRef<string[]>([
		"Start where you are. - Arthur Ashe",
		"Keep going. - Sam Levenson",
		"Start to be great. - Zig Ziglar",
		"Choose discipline. - Abraham Lincoln",
		"Repeat small efforts. - Robert Collier",
		"Persist daily. - Walter Elliot",
		"Do it today. - Mahatma Gandhi",
		"Small deeds matter. - Peter Marshall",
		"Hard jobs first. - Dale Carnegie",
		"You make a difference. - William James",
		"Be all in. - Bryan Hutchinson",
		"Little becomes a lot. - Anonymous",
	]);

	// compute initial quote value first (avoid inline initializer function)
	// ensure a string is produced even if tsconfig enables noUncheckedIndexedAccess
	const idx = quotes.current.length > 0 ? Math.floor(Math.random() * quotes.current.length) : 0;
	const initialQuote: string = quotes.current[idx] ?? quotes.current[0] ?? "";
	const [quote, setQuote] = useState<string>(initialQuote);

	// Interval ref - use the exact return type of window.setInterval to avoid lib conflicts
	const intervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);

	// prev-values ref for durations/session type
	const prevVals = useRef({ workMinutes, breakMinutes, isWork });

	// Update timeLeft only when durations or session type change (don't run when pausing)
	useEffect(() => {
		const prev = prevVals.current;
		const changed =
			workMinutes !== prev.workMinutes || breakMinutes !== prev.breakMinutes || isWork !== prev.isWork;

		// If timer is NOT running and one of the tracked values changed, reset to the active session duration.
		if (!isRunning && changed) {
			setTimeLeft((isWork ? workMinutes : breakMinutes) * 60);
		}

		// store current values for next run
		prevVals.current = { workMinutes, breakMinutes, isWork };
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

	const toggleStart = () =>
		setIsRunning((prev) => {
			const next = !prev;
			if (next) setHasStarted(true); // mark started when transitioned to running
			return next;
		});

	const resetTimer = () => {
		setIsRunning(false);
		setIsWork(true);
		setTimeLeft(workMinutes * 60);
		setHasStarted(false); // reset initial state so first view is green again
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

	// Visual classes based on state
	// show green when running OR when it's the initial (not started) view; show red only when paused after starting
	const timeColorClass = isRunning || !hasStarted ? "text-emerald-800" : "text-red-600";
	const barColorClass = isRunning ? "bg-emerald-700" : "bg-red-600";
	const startBtnClasses = "px-4 py-2 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow";
	const resetBtnClasses = "px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 text-white";

	// control initial reveal
	const [showMotivation, setShowMotivation] = useState<boolean>(false);
	const [showTimer, setShowTimer] = useState<boolean>(false);

	return (
		<div className="p-8 w-full max-w-3xl mx-auto text-slate-900">
			<h2 className="text-3xl md:text-4xl font-semibold mb-6">Motivation & Pomodoro</h2>

			{/* Brain Burst Section - conditionally shown */}
			{!showTimer ? (
				<div
					className="rounded-lg mb-6 flex flex-col items-center justify-center"
					style={{
						minHeight: "250px",
						background: "linear-gradient(180deg,#ffffff 0%, #f8fafc 100%)",
						border: "1px solid rgba(15,23,42,0.04)",
						padding: "40px 28px",
						boxShadow: "0 8px 30px rgba(2,6,23,0.06)",
					}}
				>
					<h3 className="text-2xl font-semibold text-slate-800 mb-2 text-center">Ready to focus?</h3>
					<p className="text-slate-600 text-center mb-6 max-w-sm">
						Start a productive session with our Pomodoro timer and achieve your goals
					</p>
					<button
						onClick={() => setShowTimer(true)}
						className="px-10 py-4 rounded-full text-white text-xl font-bold shadow-lg hover:scale-105 transition transform duration-200"
						style={{
							background: "linear-gradient(90deg,#f59e0b,#ef476f)",
							border: "none",
						}}
					>
						⚡ Brain Burst ⚡
					</button>
				</div>
			) : (
				<div
					className="bg-white rounded-lg p-6 mb-6 shadow-lg"
					style={{
						height: "340px",
						boxSizing: "border-box",
						overflow: "hidden",
					}}
				>
					<div className="flex justify-between items-center mb-4">
						<span className="text-base text-slate-700">{isWork ? "Focus Session" : "Break"}</span>
						<button
							onClick={() => setShowTimer(false)}
							className="text-sm px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white font-semibold"
						>
							Back
						</button>
					</div>

					<div className="text-center mb-4">
						<div className={`text-7xl md:text-8xl font-mono ${timeColorClass}`}>{formatTime(timeLeft)}</div>
						<div className="text-sm text-slate-600 mt-2">{progressPercent}%</div>
					</div>

					<div className="h-4 bg-gray-200 rounded overflow-hidden mb-4">
						<div
							className={`h-full ${barColorClass} shadow-inner`}
							style={{ width: `${progressPercent}%`, transition: "width 0.24s linear" }}
						/>
					</div>

					<div className="flex gap-3 justify-center mb-4">
						<button onClick={toggleStart} className={startBtnClasses}>
							{isRunning ? "Pause" : "Start"}
						</button>
						<button onClick={resetTimer} className={resetBtnClasses}>
							Reset
						</button>
						<button onClick={skipSession} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
							Skip
						</button>
					</div>

					{/* Duration controls */}
					<div className="flex gap-6 justify-center text-sm">
						<div className="flex items-center gap-2">
							<span className="text-slate-700">Work</span>
							<button
								onClick={() => setWorkMinutes((m) => Math.max(1, m - 1))}
								className="px-3 py-1 bg-gray-100 text-slate-700 border border-gray-200 rounded"
							>
								-
							</button>
							<span className="w-10 text-center">{workMinutes}m</span>
							<button
								onClick={() => setWorkMinutes((m) => Math.min(180, m + 1))}
								className="px-3 py-1 bg-gray-100 text-slate-700 border border-gray-200 rounded"
							>
								+
							</button>
						</div>

						<div className="flex items-center gap-2">
							<span className="text-slate-700">Break</span>
							<button
								onClick={() => setBreakMinutes((m) => Math.max(1, m - 1))}
								className="px-3 py-1 bg-gray-100 text-slate-700 border border-gray-200 rounded"
							>
								-
							</button>
							<span className="w-10 text-center">{breakMinutes}m</span>
							<button
								onClick={() => setBreakMinutes((m) => Math.min(60, m + 1))}
								className="px-3 py-1 bg-gray-100 text-slate-700 border border-gray-200 rounded"
							>
								+
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Quote Card - conditionally shown */}
			{!showMotivation ? (
				<div
					className="rounded-lg mb-6 flex flex-col items-center justify-center"
					style={{
						minHeight: "250px",
						background: "linear-gradient(180deg,#ffffff 0%, #fbfbff 100%)",
						border: "1px solid rgba(15,23,42,0.04)",
						padding: "40px 28px",
						boxShadow: "0 8px 30px rgba(2,6,23,0.06)",
					}}
				>
					<h3 className="text-2xl font-semibold text-slate-800 mb-2 text-center">Need a boost?</h3>
					<p className="text-slate-600 text-center mb-6 max-w-sm">
						Get inspired with a motivational quote to keep you focused and energized
					</p>
					<button
						onClick={() => setShowMotivation(true)}
						className="px-10 py-4 rounded-full text-white text-xl font-bold shadow-lg hover:scale-105 transition transform duration-200"
						style={{
							background: "linear-gradient(90deg,#f59e0b,#ef476f)",
							border: "none",
						}}
					>
						✨ Motivate Me ✨
					</button>
				</div>
			) : (
				<div
					className="bg-white rounded-lg p-6"
					style={{
						height: "200px",
						boxSizing: "border-box",
						overflow: "hidden",
					}}
				>
					<h3 className="text-xl font-medium mb-3 text-slate-800">Motivational Quote</h3>
					<p
						className="italic mb-4"
						style={{
							background: "linear-gradient(90deg, #10b981, #6366f1, #ec4899, #f59e0b)",
							WebkitBackgroundClip: "text",
							backgroundClip: "text",
							color: "transparent",
							animation: "fadeIn 1.5s ease-in-out",
						}}
					>
						"{quote}"
					</p>
					<div className="flex gap-3">
						<button onClick={newQuote} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">
							New Quote
						</button>
						<button
							onClick={() => {
								if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
									navigator.clipboard.writeText(quote);
								}
							}}
							className="px-4 py-2 rounded bg-zinc-600 hover:bg-zinc-700 text-white"
						>
							Copy
						</button>
						<button
							onClick={() => setShowMotivation(false)}
							className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white ml-auto"
						>
							Back
						</button>
					</div>
					<style>{`
						@keyframes fadeIn {
							from {
								opacity: 0;
							}
							to {
								opacity: 1;
							}
						}
					`}</style>
				</div>
			)}
		</div>
	);
}


