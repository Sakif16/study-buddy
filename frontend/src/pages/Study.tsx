import { useRef, useState } from "react";
import PomodoroWidget from "../components/PomodoroWidget";
import { getStudyBreak, getRandomQuote } from "../PomodoroApi";

export default function Motivation() {
	// Pomodoro is rendered by PomodoroWidget and persisted via PomodoroContext

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

	// Pick a new random quote (used by the "New Quote" button)
	const newQuote = async () => {
		if (quotes.current.length === 0) return
		try {
			const q = await getRandomQuote()
			const text = typeof q.text === 'string' ? q.text : ''
			const author = typeof q.author === 'string' && q.author ? ` - ${q.author}` : ''
			setQuote((text + author) || (quotes.current[0] ?? ''))
		} catch {
			const i = Math.floor(Math.random() * quotes.current.length)
			setQuote(quotes.current[i] ?? quotes.current[0] ?? "")
		}
	}



	// control initial reveal
	const [showMotivation, setShowMotivation] = useState<boolean>(false);
	const [showToast, setShowToast] = useState<boolean>(false);

	// Study Break Suggestions state
	const [showBreaksPanel, setShowBreaksPanel] = useState<boolean>(false);
	const [healthIndex, setHealthIndex] = useState<number>(0);
	const [mentalIndex, setMentalIndex] = useState<number>(0);
	const [envIndex, setEnvIndex] = useState<number>(0);
	const [energyIndex, setEnergyIndex] = useState<number>(0);
	const [activeCategory, setActiveCategory] = useState<string>("");
	const [currentSuggestion, setCurrentSuggestion] = useState<{ category: string; text: string } | null>(null);

	// Deterministic suggestion lists (no external calls)
	const healthSuggestions = [
		"Stand up and stretch for 2 minutes — loosen tight muscles.",
		"Drink a full glass of water to rehydrate and refocus.",
		"Do 10 gentle shoulder rolls to relieve tension.",
		"Take a short walk around the room or hallway (3–5 minutes).",
	];
	const mentalSuggestions = [
		"Close your eyes and take 6 deep breaths — calm your mind.",
		"List 3 small wins from today to build momentum.",
		"Do a 60-second progressive muscle relax: tense then release.",
		"Try a 2-minute mindful body scan to reset attention.",
	];
	const envSuggestions = [
		"Open a window for fresh air and a quick sensory reset.",
		"Tidy your desk for 2 minutes — clutter drains focus.",
		"Adjust lighting to reduce glare and increase contrast.",
		"Add a quick plant-care task: water or reposition a plant.",
	];
	const energySuggestions = [
		"Do 10 jumping jacks or jog in place for 60 seconds.",
		"Eat a quick protein snack to steady your energy.",
		"Splash cold water on your face or wrists for an instant jolt.",
		"Stand and do 20 calf raises to boost circulation.",
	];

	

	return (
		<div className="p-8 w-full max-w-5xl mx-auto text-slate-900">
			{/* Toast Notification */}
			{showToast && (
				<div
					style={{
						position: "fixed",
						top: "20px",
						left: "50%",
						transform: "translateX(-50%)",
						background: "linear-gradient(90deg, #10b981, #059669)",
						color: "white",
						padding: "16px 24px",
						borderRadius: "8px",
						boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
						zIndex: 1000,
						fontSize: "16px",
						fontWeight: "600",
						animation: "slideDown 0.3s ease-out",
					}}
				>
					✓ Copied to clipboard!
				</div>
			)}

			{/* Top Row - Pomodoro Clock Centered */}
			<div className="flex justify-center mb-6">
				<PomodoroWidget />
			</div>

			{/* Bottom Row - Motivational Quotes and White Noise */}
			<div className="flex gap-6 mb-6">
				{/* Study Break Suggestions: four categories with predefined suggestions. */}
				{/* Left Column - Motivational Quotes */}
				<div className="flex-none" style={{ display: 'flex', flexDirection: 'column', height: 420, width: 520, minWidth: 360, boxSizing: 'border-box', overflow: 'hidden' }}>
					<h3 className="text-2xl font-semibold text-slate-800 mb-4">Motivational Quotes</h3>

					{/* Quote Card - conditionally shown */}
					{!showMotivation ? (
						<div
							className="rounded-lg"
							style={{
								height: 420,
								width: '100%',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								background: "linear-gradient(180deg,#ffffff 0%, #fbfbff 100%)",
								border: "1px solid rgba(15,23,42,0.04)",
								padding: 24,
								boxShadow: "0 8px 30px rgba(2,6,23,0.06)",
								boxSizing: 'border-box'
							}}
						>
							<h3 className="text-2xl font-semibold text-slate-800 mb-2 text-center">Need a boost?</h3>
							<p className="text-slate-600 text-center mb-6 max-w-sm">
								Get inspired with a motivational quote to keep you focused and energized
							</p>
							<button
								onClick={async () => {
									setShowMotivation(true)
									try {
										const q = await getRandomQuote()
										const text = typeof q.text === 'string' ? q.text : ''
										const author = typeof q.author === 'string' && q.author ? ` - ${q.author}` : ''
										setQuote((text + author) || (quotes.current[0] ?? ''))
									} catch {
										const i = Math.floor(Math.random() * quotes.current.length)
										setQuote(quotes.current[i] ?? quotes.current[0] ?? '')
									}
								}}
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
							className="bg-white rounded-lg"
							style={{
								height: 420,
								width: '100%',
								boxSizing: "border-box",
								overflow: "visible",
								background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
								display: 'flex',
								flexDirection: 'column',
								padding: 20
							}}
						>
							<div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: 'space-between' }}>
								<div style={{ textAlign: "center", marginBottom: "8px", fontSize: "28px" }}>✨</div>
								<h3 className="text-xl font-medium mb-3 text-slate-800 text-center">Today's Inspiration</h3>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    	<div style={{
                                 		background: "linear-gradient(135deg, #f0f9ff 0%, #fef3c7 100%)",
                                 		border: "2px solid #e0e7ff",
                                 		borderRadius: 12,
                                 		padding: 12,
                                 		width: '100%',
                                 		height: 100,
                                 		display: 'flex',
                                 		alignItems: 'center',
                                 		justifyContent: 'center',
                                 		boxSizing: 'border-box',
                                 		flex: 'none',
                                 		overflowY: 'auto'
                                 	}}>
										<p
											className="italic text-center"
											style={{
												background: "linear-gradient(90deg, #10b981, #6366f1, #ec4899, #f59e0b)",
												WebkitBackgroundClip: "text",
												backgroundClip: "text",
												color: "transparent",
												animation: "fadeIn 1.5s ease-in-out",
												fontSize: "16px",
												lineHeight: "1.5",
												fontWeight: "500",
												margin: 0,
												padding: 0,
											}}
										>
											"{quote}"
										</p>
									</div>
								</div>

								<div>
									<div style={{
										textAlign: "center",
										marginBottom: "12px",
										padding: "10px",
										background: "transparent",
										borderRadius: "8px",
										fontSize: "13px",
										color: "#000000",
										fontWeight: "500",
										animation: "fadeIn 2s ease-in-out"
									}}>
									You are capable of amazing things! Keep pushing forward. 💪
									</div>

									<div className="flex gap-2 justify-center flex-wrap">
										<button onClick={newQuote} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition transform hover:scale-105">
											✨ New Quote
										</button>
										<button
											onClick={() => {
												if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
													navigator.clipboard.writeText(quote);
													setShowToast(true);
													setTimeout(() => setShowToast(false), 2000);
												}
											}}
											className="px-3 py-2 rounded bg-zinc-600 hover:bg-zinc-700 text-white text-sm font-medium transition transform hover:scale-105"
										>
											📋 Copy
										</button>
										<button
											onClick={() => setShowMotivation(false)}
											className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition transform hover:scale-105"
										>
											← Back
										</button>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Right Column - Study Break Suggestions (replaces white noise) */}
				<div className="flex-none" style={{ display: 'flex', flexDirection: 'column', height: 420, width: 520, minWidth: 360, boxSizing: 'border-box', overflow: 'hidden' }}>
					<h3 className="text-2xl font-semibold text-slate-800 mb-4">Study Break Suggestions</h3>
					{!showBreaksPanel ? (
						<div
							className="rounded-lg"
							style={{
								height: 420,
								width: '100%',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								background: "linear-gradient(180deg,#ffffff 0%, #f8fafc 100%)",
								border: "1px solid rgba(15,23,42,0.04)",
								padding: 24,
								boxShadow: "0 8px 30px rgba(2,6,23,0.06)",
								boxSizing: 'border-box'
							}}
						>
							<h3 className="text-2xl font-semibold text-slate-800 mb-2 text-center">Take a Break</h3>
							<p className="text-slate-600 text-center mb-6 max-w-sm">Short, focused break ideas to refresh your body and mind</p>
							<button
								onClick={() => setShowBreaksPanel(true)}
								className="px-10 py-4 rounded-full text-white text-xl font-bold shadow-lg hover:scale-105 transition transform duration-200"
								style={{ background: "linear-gradient(90deg,#06b6d4,#0ea5e9)", border: "none" }}
							>
								☕ Show Breaks
							</button>
						</div>
					) : (
						<div className="rounded-lg p-6 bg-white shadow-sm flex flex-col justify-between" style={{ height: 420, width: '100%', boxSizing: 'border-box', border: "1px solid rgba(15,23,42,0.04)", paddingBottom: 56 }}>
							<div className="text-center" style={{ paddingBottom: 8 }}>
								<div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-yellow-50 mx-auto mb-3">
									<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" role="img" aria-hidden="false">
										<title>Sun icon</title>
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M8.757 15.243l-2.121 2.121m12.728 0l-2.121-2.121M8.757 8.757L6.636 6.636" />
									</svg>
								</div>
								<h3 className="text-xl font-semibold text-slate-800">Moments to Recharge</h3>
							</div>

							<div className="mt-4" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
								<div className="flex gap-3 justify-center items-center mb-2 flex-nowrap overflow-x-auto" style={{ paddingTop: 6 }}>
									<button
										onClick={async () => {
											const i = (healthIndex + 1) % healthSuggestions.length
											setHealthIndex(i)
											setActiveCategory('Health')
											try {
												const res = await getStudyBreak('Health')
												const s = res?.suggestion
												setCurrentSuggestion({ category: s?.category ?? 'Health', text: s?.text ?? healthSuggestions[i] ?? '' })
											} catch {
												setCurrentSuggestion({ category: 'Health', text: healthSuggestions[i] ?? '' })
											}
										}}
										className={`px-4 py-2 rounded-full text-sm font-medium ${activeCategory === 'Health' ? 'bg-emerald-700 text-white shadow' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
									>
										Health
									</button>

									<button
										onClick={async () => {
											const i = (mentalIndex + 1) % mentalSuggestions.length
											setMentalIndex(i)
											setActiveCategory('Mental')
											try {
												const res = await getStudyBreak('Mental')
												const s = res?.suggestion
												setCurrentSuggestion({ category: s?.category ?? 'Mental', text: s?.text ?? mentalSuggestions[i] ?? '' })
											} catch {
												setCurrentSuggestion({ category: 'Mental', text: mentalSuggestions[i] ?? '' })
											}
										}}
										className={`px-4 py-2 rounded-full text-sm font-medium ${activeCategory === 'Mental' ? 'bg-indigo-700 text-white shadow' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
									>
										Mental
									</button>

									<button
										onClick={async () => {
											const i = (envIndex + 1) % envSuggestions.length
											setEnvIndex(i)
											setActiveCategory('Environment')
											try {
												const res = await getStudyBreak('Environment')
												const s = res?.suggestion
												setCurrentSuggestion({ category: s?.category ?? 'Environment', text: s?.text ?? envSuggestions[i] ?? '' })
											} catch {
												setCurrentSuggestion({ category: 'Environment', text: envSuggestions[i] ?? '' })
											}
										}}
										className={`px-4 py-2 rounded-full text-sm font-medium ${activeCategory === 'Environment' ? 'bg-sky-700 text-white shadow' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}
									>
										Environment
									</button>

									<button
										onClick={async () => {
											const i = (energyIndex + 1) % energySuggestions.length
											setEnergyIndex(i)
											setActiveCategory('Quick Energy')
											try {
												const res = await getStudyBreak('Quick Energy')
												const s = res?.suggestion
												setCurrentSuggestion({ category: s?.category ?? 'Quick Energy', text: s?.text ?? energySuggestions[i] ?? '' })
											} catch {
												setCurrentSuggestion({ category: 'Quick Energy', text: energySuggestions[i] ?? '' })
											}
										}}
										className={`px-4 py-2 rounded-full text-sm font-medium ${activeCategory === 'Quick Energy' ? 'bg-amber-600 text-white shadow' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
									>
										Quick Energy
									</button>
								</div>

								<div className="mx-auto max-w-lg" style={{ display: 'flex', flexDirection: 'column', height: 120, minHeight: 120, flex: 'none' }}>
									<div
										className="rounded-lg text-center"
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											background: 'linear-gradient(135deg, #f0f9ff 0%, #fef3c7 100%)',
											border: '2px solid #e0e7ff',
											borderRadius: 12,
											padding: '12px',
											marginTop: 6,
											marginBottom: 6,
											height: 100,
											overflowY: 'auto',
											width: '100%',
											flex: 'none'
										}}
									>
										<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '4px 8px' }}>
											{currentSuggestion ? (
												<div style={{ maxWidth: 420 }}>
													<div className="text-xs text-slate-500 mb-1" style={{ fontWeight: 700 }}>{currentSuggestion.category}</div>
													<div className="text-md text-slate-800" style={{ fontSize: 15, lineHeight: 1.4, textAlign: 'center' }}>{currentSuggestion.text}</div>
												</div>
											) : (
												<div className="text-sm text-slate-600">Choose a category to see a short break suggestion.</div>
											)}
										</div>
									</div>
								</div>
							</div>

							<div className="mt-2 text-center" style={{ paddingTop: 0, marginTop: -12, marginBottom: 28, paddingBottom: 12 }}>
								<div className="text-sm font-semibold text-slate-700" style={{ fontStyle: 'italic', marginBottom: 12 }}>Small breaks recharge great minds.</div>
								<div className="flex justify-center gap-3" style={{ marginTop: 6, marginBottom: 12 }}>
									<button
										onClick={() => {
											if (currentSuggestion && navigator.clipboard) {
												navigator.clipboard.writeText(currentSuggestion.text);
												setShowToast(true);
												setTimeout(() => setShowToast(false), 2000);
											}
										}}
										className="px-6 py-2 rounded-md bg-zinc-800 hover:bg-zinc-900 text-white text-sm font-medium shadow"
										style={{ minWidth: 110 }}
									>
										Copy
									</button>
									<button onClick={() => setShowBreaksPanel(false)} className="px-6 py-2 rounded-md bg-white border border-emerald-100 hover:bg-emerald-50 text-emerald-800 text-sm font-medium" style={{ minWidth: 110 }}>Back</button>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Styles */}
			<style>{`
				@keyframes fadeIn {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}
				@keyframes slideDown {
					from {
						opacity: 0;
						transform: translateX(-50%) translateY(-20px);
					}
					to {
						opacity: 1;
						transform: translateX(-50%) translateY(0);
					}
				}
			`}</style>
		</div>
	);
}