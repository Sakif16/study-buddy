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
		const randomIdx = quotes.current.length > 0 ? Math.floor(Math.random() * quotes.current.length) : 0;
		const randomQuote: string = quotes.current[randomIdx] ?? quotes.current[0] ?? "";
		setQuote(randomQuote);
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
	const [showToast, setShowToast] = useState<boolean>(false);
	const [isNoiseActive, setIsNoiseActive] = useState<boolean>(false);
	const [showNoisePanel, setShowNoisePanel] = useState<boolean>(false);
	// noise type and LFO refs (removed white & brown)
	type NoiseKind = "pink" | "rain" | "forest" | "ocean";
	const [noiseType, setNoiseType] = useState<NoiseKind>("pink");
	// refs to support crossfade switching
	const filterLfoRef = useRef<OscillatorNode | null>(null);
	const filterLfoGainRef = useRef<GainNode | null>(null);
	const ampLfoRef = useRef<OscillatorNode | null>(null);        // gentle amplitude LFO (ocean)
	const ampLfoGainRef = useRef<GainNode | null>(null);
	const birdIntervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const noiseOscillatorRef = useRef<AudioBufferSourceNode | null>(null);
	const noiseGainRef = useRef<GainNode | null>(null);
	const [noiseVolume, setNoiseVolume] = useState<number>(0.18); // softer default
	// track previous noise type to tune transitions, and bird-volume multiplier
	const prevNoiseTypeRef = useRef<NoiseKind>(noiseType);
	const birdVolumeRef = useRef<number>(0.6);

	// generate different colored noise buffers
	const createNoiseBuffer = (audioContext: AudioContext, type: NoiseKind, duration = 6) => {
		const sampleRate = audioContext.sampleRate;
		const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
		const data = buffer.getChannelData(0);

		// pink-based generator (used as gentle base for rain/forest/ocean)
		if (type === "pink" || type === "rain" || type === "forest" || type === "ocean") {
			let b0 = 0,
				b1 = 0,
				b2 = 0,
				b3 = 0,
				b4 = 0,
				b5 = 0,
				b6 = 0;
			for (let i = 0; i < data.length; i++) {
				const white = Math.random() * 2 - 1;
				b0 = 0.99886 * b0 + white * 0.0555179;
				b1 = 0.99332 * b1 + white * 0.0750759;
				b2 = 0.96900 * b2 + white * 0.1538520;
				b3 = 0.86650 * b3 + white * 0.3104856;
				b4 = 0.55000 * b4 + white * 0.5329522;
				b5 = -0.7616 * b5 - white * 0.0168980;
				const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
				b6 = white * 0.115926;
				// very soft scaling for deep calm and relaxation
				data[i] = out * 0.022;
			}
			return buffer;
		}

		// fallback to white (shouldn't be used)
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
		return buffer;
	};

	// spawn bird chirps with varied patterns (used by forest)
	const spawnChirp = (audioContext: AudioContext) => {
		const now = audioContext.currentTime;
		const chirpType = Math.random();

		if (chirpType < 0.5) {
			// single chirp: calmer, lower pitch natural call
			const freq = 1200 + Math.random() * 1000;
			const osc = audioContext.createOscillator();
			osc.type = Math.random() > 0.6 ? "triangle" : "sine";
			osc.frequency.setValueAtTime(freq + 800, now);
			osc.frequency.exponentialRampToValueAtTime(freq, now + 0.12);

			const bp = audioContext.createBiquadFilter();
			bp.type = "bandpass";
			bp.frequency.value = freq;
			bp.Q.value = 4;

			const g = audioContext.createGain();
			// very soft envelope for calm calling and scaled by birdVolumeRef
			const birdVol = birdVolumeRef.current ?? 0.6;
			g.gain.setValueAtTime(0.0001, now);
			g.gain.linearRampToValueAtTime((0.025 + Math.random() * 0.04) * birdVol, now + 0.025);
			g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35 + Math.random() * 0.2);

			osc.connect(bp);
			bp.connect(g);
			g.connect(audioContext.destination);

			osc.start(now);
			osc.stop(now + 0.38 + Math.random() * 0.22);
			setTimeout(() => {
				try { osc.disconnect(); bp.disconnect(); g.disconnect(); } catch {}
			}, 1200);
		} else {
			// lower, softer double chirp
			const freq1 = 1100 + Math.random() * 900;
			const freq2 = freq1 + 120 + Math.random() * 400;

			for (let i = 0; i < 2; i++) {
				setTimeout(() => {
					const t = now + (i * 0.15);
					const f = i === 0 ? freq1 : freq2;
					const osc = audioContext.createOscillator();
					osc.type = Math.random() > 0.65 ? "triangle" : "sine";
					osc.frequency.setValueAtTime(f + 600, t);
					osc.frequency.exponentialRampToValueAtTime(f, t + 0.1);

					const bp = audioContext.createBiquadFilter();
					bp.type = "bandpass";
					bp.frequency.value = f;
					bp.Q.value = 3.5;

					const g = audioContext.createGain();
					const birdVol = birdVolumeRef.current ?? 0.6;
					g.gain.setValueAtTime(0.0001, t);
					g.gain.linearRampToValueAtTime((0.02 + Math.random() * 0.035) * birdVol, t + 0.02);
					g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32 + Math.random() * 0.18);

					osc.connect(bp);
					bp.connect(g);
					g.connect(audioContext.destination);

					osc.start(t);
					osc.stop(t + 0.35 + Math.random() * 0.15);
					setTimeout(() => {
						try { osc.disconnect(); bp.disconnect(); g.disconnect(); } catch {}
					}, 1200);
				}, i === 0 ? 0 : 150);
			}
		}
	};

	// start noise (internal)
	const startNoise = (type: NoiseKind) => {
		const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		const audioContext = new AudioContextClass() as AudioContext;
		audioContextRef.current = audioContext;

		const buffer = createNoiseBuffer(audioContext, type, 8);
		const source = audioContext.createBufferSource();
		source.buffer = buffer;
		source.loop = true;

		// gentle shaping tuned for calming/stress relief (softer for pink/rain)
		const filterNode = audioContext.createBiquadFilter();
		filterNode.type = type === "rain" ? "highpass" : "lowpass";
		filterNode.frequency.value =
			type === "ocean" ? 650 : type === "forest" ? 1500 : type === "rain" ? 600 : 1600;
		filterNode.Q.value = 0.65;

		const gainNode = audioContext.createGain();
		gainNode.gain.value = 0.0001; // start near 0 for smooth fade in
		noiseGainRef.current = gainNode;
		// record currently active type and default bird volume
		prevNoiseTypeRef.current = type;
		// default bird volume; forest will override below for immediate calm
		birdVolumeRef.current = 0.6;

		// very subtle filter modulation for ultra-calm pink/rain
		if (type === "pink" || type === "rain" || type === "ocean" || type === "forest") {
			const fLfo = audioContext.createOscillator();
			const fLfoGain = audioContext.createGain();
			fLfo.type = "sine";
			fLfo.frequency.value = type === "ocean" ? 0.04 : type === "forest" ? 0.09 : 0.015; // very slow for pink/rain
			fLfoGain.gain.value = type === "pink" ? 15 : type === "rain" ? 12 : 35; // minimal depth for pink/rain
			fLfo.connect(fLfoGain);
			fLfoGain.connect(filterNode.frequency);
			fLfo.start();
			filterLfoRef.current = fLfo;
			filterLfoGainRef.current = fLfoGain;
		}

		// ocean: add an ultra-slow, very shallow amplitude LFO to simulate calm swells
		if (type === "ocean") {
			// ensure previous amp LFO stopped
			if (ampLfoRef.current) {
				try { ampLfoRef.current.stop(); } catch {}
				ampLfoRef.current.disconnect(); ampLfoRef.current = null;
			}
			if (ampLfoGainRef.current) {
				ampLfoGainRef.current.disconnect(); ampLfoGainRef.current = null;
			}
			const aLfo = audioContext.createOscillator();
			const aLfoGain = audioContext.createGain();
			aLfo.type = "sine";
			aLfo.frequency.value = 0.03; // very slow swell
			// depth scaled by noiseVolume for gentle effect
			aLfoGain.gain.value = Math.max(0.00008, noiseVolume * 0.02);
			aLfo.connect(aLfoGain);
			aLfoGain.connect(gainNode.gain);
			aLfo.start();
			ampLfoRef.current = aLfo;
			ampLfoGainRef.current = aLfoGain;
		}

		source.connect(filterNode);
		filterNode.connect(gainNode);
		gainNode.connect(audioContext.destination);
		source.start();

		// smooth fade in (slower for more natural)
		const now = audioContext.currentTime;
		gainNode.gain.cancelScheduledValues(now);
		gainNode.gain.setValueAtTime(0.0001, now);
		// keep initial start conservative (cap to 60% of requested volume)
		const startTarget = Math.max(0.001, Math.min(noiseVolume, 0.6) * 0.6);
		gainNode.gain.exponentialRampToValueAtTime(startTarget, now + 2.0);

		noiseOscillatorRef.current = source;
		setIsNoiseActive(true);

		// forest: schedule natural bird chirps at varied intervals
		if (type === "forest") {
			// immediate calm: lower bird volume and slightly sparser schedule for realism
			birdVolumeRef.current = 0.45;
			birdIntervalRef.current = window.setInterval(() => {
				spawnChirp(audioContext);
				if (Math.random() < 0.28) setTimeout(() => spawnChirp(audioContext), 500 + Math.random() * 1200);
			}, 2600 + Math.random() * 3200);
		}
	};

	// stop and cleanup
	const stopNoise = () => {
		const audioContext = audioContextRef.current;
		if (!audioContext) return;
		const now = audioContext.currentTime;
		// fade out
		if (noiseGainRef.current) {
			const g = noiseGainRef.current;
			g.gain.cancelScheduledValues(now);
			// use the active gain node reference 'g' (noiseGainRef.current)
			g.gain.setValueAtTime(g.gain.value, now);
			g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
		}
		// stop amp LFO if present
		if (ampLfoRef.current) {
			try { ampLfoRef.current.stop(); } catch {}
			ampLfoRef.current.disconnect();
			ampLfoRef.current = null;
		}
		if (ampLfoGainRef.current) {
			ampLfoGainRef.current.disconnect();
			ampLfoGainRef.current = null;
		}

		// stop source after fade
		if (noiseOscillatorRef.current) {
			try {
				noiseOscillatorRef.current.stop(now + 1.3);
			} catch {}
			noiseOscillatorRef.current = null;
		}
		// stop LFO
		if (filterLfoRef.current) {
			try { filterLfoRef.current.stop(); } catch {}
			filterLfoRef.current.disconnect();
			filterLfoRef.current = null;
		}
		if (filterLfoGainRef.current) {
			filterLfoGainRef.current.disconnect();
			filterLfoGainRef.current = null;
		}
		// clear birds
		if (birdIntervalRef.current) {
			clearInterval(birdIntervalRef.current);
			birdIntervalRef.current = null;
		}
		// close context after a short delay
		setTimeout(() => {
			if (audioContextRef.current) {
				try { audioContextRef.current.close(); } catch {}
				audioContextRef.current = null;
			}
			noiseGainRef.current = null;
			setIsNoiseActive(false);
		}, 1000);
	};

	// switch smoothly to a new type if playing
	const switchNoise = (newType: NoiseKind) => {
		if (!audioContextRef.current || !isNoiseActive) {
			startNoise(newType);
			return;
		}
		const audioContext = audioContextRef.current;
		// create new source + gain
		const buffer = createNoiseBuffer(audioContext, newType, 8);
		const newSource = audioContext.createBufferSource();
		newSource.buffer = buffer;
		newSource.loop = true;
		const newFilter = audioContext.createBiquadFilter();
		newFilter.type = newType === "rain" ? "highpass" : "lowpass";
		newFilter.frequency.value = newType === "ocean" ? 650 : newType === "forest" ? 1500 : newType === "rain" ? 600 : 1600;
		const newGain = audioContext.createGain();
		newGain.gain.value = 0.000001; // extremely low starting gain
		newSource.connect(newFilter);
		newFilter.connect(newGain);
		newGain.connect(audioContext.destination);
		newSource.start();

		// slower crossfade for smooth transition
		const now = audioContext.currentTime;
		// determine conservative safe cap: make rain->forest and forest->ocean especially quiet
		const prev = prevNoiseTypeRef.current;
		let safeCap = Math.min(noiseVolume, 0.45); // general cap

		// Make the specific transitions much quieter and gentler
		if ((prev === "rain" && newType === "forest") || (prev === "forest" && newType === "ocean")) {
			safeCap = Math.min(safeCap, 0.12); // much lower cap for these transitions
			birdVolumeRef.current = 0.22; // keep birds very soft during/after transition
		} else {
			birdVolumeRef.current = 0.6;
		}

		// if new is ocean, create amp LFO for gentle swells on the new gain
		if (newType === "ocean") {
			if (ampLfoRef.current) {
				try { ampLfoRef.current.stop(); } catch {}
				ampLfoRef.current.disconnect();
				ampLfoRef.current = null;
			}
			if (ampLfoGainRef.current) {
				ampLfoGainRef.current.disconnect();
				ampLfoGainRef.current = null;
			}
			const aLfo = audioContext.createOscillator();
			const aLfoGain = audioContext.createGain();
			aLfo.type = "sine";
			aLfo.frequency.value = 0.03;
			aLfoGain.gain.value = Math.max(0.00005, safeCap * 0.02);
			aLfo.connect(aLfoGain);
			aLfoGain.connect(newGain.gain);
			aLfo.start();
			ampLfoRef.current = aLfo;
			ampLfoGainRef.current = aLfoGain;
		}

		// schedule new source: remain essentially silent while old fades, then very slowly rise to safeCap
		newGain.gain.setValueAtTime(0.000001, now);
		newGain.gain.exponentialRampToValueAtTime(0.00002, now + 3.2); // stay inaudible while old fades
		newGain.gain.exponentialRampToValueAtTime(Math.max(0.001, safeCap * 0.25), now + 5.0); // gentle intermediate
		newGain.gain.exponentialRampToValueAtTime(Math.max(0.001, safeCap), now + 8.0); // final quiet level

		if (noiseGainRef.current) {
			const oldG = noiseGainRef.current;
			oldG.gain.cancelScheduledValues(audioContext.currentTime);
			oldG.gain.setValueAtTime(oldG.gain.value, audioContext.currentTime);
			// fade old source to near-silent by ~3s to avoid overlap at high volume
			oldG.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 3.0);
		}

		// stop old source shortly after it goes silent
		if (noiseOscillatorRef.current) {
			try { noiseOscillatorRef.current.stop(audioContext.currentTime + 3.1); } catch {}
		}

		// now track the new nodes so future controls affect them
		noiseOscillatorRef.current = newSource;
		noiseGainRef.current = newGain;

		// record newType as current
		prevNoiseTypeRef.current = newType;

		// recreate gentle filter LFO if needed (forest/ocean/pink)
		if (filterLfoRef.current) {
			try { filterLfoRef.current.stop(); } catch {}
			filterLfoRef.current.disconnect();
			filterLfoRef.current = null;
		}
		if (filterLfoGainRef.current) {
			filterLfoGainRef.current.disconnect();
			filterLfoGainRef.current = null;
		}
		if (newType === "ocean" || newType === "forest" || newType === "pink") {
			const fLfo = audioContext.createOscillator();
			const fLfoGain = audioContext.createGain();
			fLfo.type = "sine";
			fLfo.frequency.value = newType === "ocean" ? 0.04 : newType === "forest" ? 0.09 : 0.015;
			fLfoGain.gain.value = newType === "pink" ? 15 : 35;
			fLfo.connect(fLfoGain);
			// connect the filter LFO gain to the new filter's frequency param
			fLfoGain.connect(newFilter.frequency);
			fLfo.start();
			filterLfoRef.current = fLfo;
			filterLfoGainRef.current = fLfoGain;
		}

		// handle bird scheduler for forest
		if (birdIntervalRef.current) {
			clearInterval(birdIntervalRef.current);
			birdIntervalRef.current = null;
		}
		if (newType === "forest") {
			// calmer immediate forest: slightly lower-volume birds and gentler rate
			birdVolumeRef.current = 0.45;
			birdIntervalRef.current = window.setInterval(() => {
				spawnChirp(audioContext);
				if (Math.random() < 0.28) setTimeout(() => spawnChirp(audioContext), 500 + Math.random() * 1200);
			}, 2600 + Math.random() * 3200);
		}
	};

	const handleVolumeChange = (newVolume: number) => {
		// store requested volume but apply a gentle live-scaling so immediate changes stay calming
		setNoiseVolume(newVolume);
		if (noiseGainRef.current) {
			// scale live gain to a fraction so slider adjustments don't instantly become loud
			const live = Math.min(newVolume, 0.6) * 0.55; // keep live adjustments modest
			noiseGainRef.current.gain.value = live;
		}
	};

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
				<div style={{ width: "50%" }}> {/* increased width */}
					<h3 className="text-2xl font-semibold text-slate-800 mb-4 text-center">Pomodoro Clock</h3>
					<div
						className="bg-white rounded-lg p-6 shadow-lg"
						style={{
							height: "420px", /* increased height */
							boxSizing: "border-box",
							overflow: "hidden",
						}}
					>
						<div className="flex justify-between items-center mb-4">
							<span className="text-base text-slate-700">{isWork ? "Focus Session" : "Break"}</span>
						</div>

						<div className="text-center mb-4">
							<div className={`text-7xl md:text-8xl font-mono ${timeColorClass}`}>{formatTime(timeLeft)}</div> {/* larger clock font */}
							<div className="text-sm text-slate-600 mt-2">{progressPercent}%</div>
						</div>

						<div className="h-4 bg-gray-200 rounded overflow-hidden mb-4">
							<div
								className={`h-full ${barColorClass} shadow-inner`}
								style={{ width: `${progressPercent}%`, transition: "width 0.24s linear" }}
							/>
						</div>

						<div className="flex gap-2 justify-center mb-4">
							<button onClick={toggleStart} className={startBtnClasses}>
								{isRunning ? "Pause" : "Start"}
							</button>
							<button onClick={resetTimer} className={resetBtnClasses}>
								Reset
							</button>
							<button onClick={skipSession} className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
								Skip
							</button>
						</div>

						{/* Duration controls */}
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

			{/* Bottom Row - Motivational Quotes and White Noise */}
			<div className="flex gap-6 mb-6">
				{/* Left Column - Motivational Quotes */}
				<div className="flex-1">
					<h3 className="text-2xl font-semibold text-slate-800 mb-4">Motivational Quotes</h3>

					{/* Quote Card - conditionally shown */}
					{!showMotivation ? (
						<div
							className="rounded-lg flex flex-col items-center justify-center"
							style={{
								minHeight: "350px",
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
								minHeight: "350px",
								boxSizing: "border-box",
								overflow: "hidden",
								background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
							}}
						>
							<div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
								<div>
									<div style={{ textAlign: "center", marginBottom: "12px", fontSize: "32px" }}>✨</div>
									<h3 className="text-xl font-medium mb-4 text-slate-800 text-center">Today's Inspiration</h3>
									<div style={{
										background: "linear-gradient(135deg, #f0f9ff 0%, #fef3c7 100%)",
										border: "2px solid #e0e7ff",
										borderRadius: "12px",
										padding: "20px 16px",
										marginBottom: "16px",
									}}>
										<p
											className="italic text-center"
											style={{
												background: "linear-gradient(90deg, #10b981, #6366f1, #ec4899, #f59e0b)",
												WebkitBackgroundClip: "text",
												backgroundClip: "text",
												color: "transparent",
												animation: "fadeIn 1.5s ease-in-out",
												fontSize: "18px",
												lineHeight: "1.6",
												fontWeight: "500",
											}}
										>
											"{quote}"
										</p>
									</div>
								</div>

								<div>
									<div style={{
										textAlign: "center",
										marginBottom: "16px",
										padding: "12px",
										background: "transparent",
										borderRadius: "8px",
										fontSize: "14px",
										color: "#000000",
 										fontWeight: "500",
 										animation: "fadeIn 2s ease-in-out"
 									}}>
 										You are capable of amazing things! Keep pushing forward. 💪
 									</div>

									<div className="flex gap-2 justify-center flex-wrap">
										<button onClick={newQuote} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition transform hover:scale-105">
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
											className="px-4 py-2 rounded bg-zinc-600 hover:bg-zinc-700 text-white text-sm font-medium transition transform hover:scale-105"
										>
											📋 Copy
										</button>
										<button
											onClick={() => setShowMotivation(false)}
											className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition transform hover:scale-105"
										>
											← Back
										</button>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Right Column - White Noise */}
				<div className="flex-1">
					<h3 className="text-2xl font-semibold text-slate-800 mb-4">White Noise</h3>
					{/* White Noise Cover - conditionally shown */}
					{!showNoisePanel ? (
						<div
							className="rounded-lg flex flex-col items-center justify-center"
							style={{
								minHeight: "350px",
								background: "linear-gradient(180deg,#f0f9ff 0%, #fef3c7 100%)",
								border: "1px solid rgba(15,23,42,0.04)",
								padding: "40px 28px",
								boxShadow: "0 8px 30px rgba(2,6,23,0.06)",
							}}
						>
							<h3 className="text-2xl font-semibold text-slate-800 mb-2 text-center">Ready to focus?</h3>
							<p className="text-slate-600 text-center mb-6 max-w-sm">
								Immerse yourself in calming white noise to enhance concentration
							</p>
							<button
								onClick={() => setShowNoisePanel(true)}
								className="px-10 py-4 rounded-full text-white text-xl font-bold shadow-lg hover:scale-105 transition transform duration-200"
								style={{
									background: "linear-gradient(90deg,#3b82f6,#1e40af)",
									border: "none",
								}}
							>
								🎵 Activate Noise 🎵
							</button>
						</div>
					) : (
						<div
							className="bg-white rounded-lg p-6 shadow-lg"
							style={{
								minHeight: "350px",
								boxSizing: "border-box",
								display: "flex",
								flexDirection: "column",
								justifyContent: "space-between",
							}}
						>
							<div>
								<h3 className="text-xl font-medium mb-4 text-slate-800 text-center">Tune In Your Sound</h3>
								<p className="text-slate-600 mb-6 text-sm text-center">
									Drown out distractions and drift into flow — pick a calming sound and fine‑tune the volume until it feels just right.
								</p>
							</div>

							<div>
								<div className="flex gap-3 items-center mb-4">
									<select
										value={noiseType}
										onChange={(e) => {
											const next = e.target.value as NoiseKind;
											// reflect new selection in UI immediately
											setNoiseType(next);
											// if currently playing, crossfade smoothly into the new selection
											if (isNoiseActive) {
												switchNoise(next);
											} else {
												// remain stopped; user can press Play to start the newly-selected noise
											}
										}}
										className="px-3 py-2 border border-gray-200 rounded-md"
									>
										<option value="pink">Pink Noise (balanced)</option>
										<option value="rain">Rain Sounds</option>
										<option value="forest">Forest Ambience</option>
										<option value="ocean">Ocean Waves</option>
									</select>

									<button
										onClick={() => {
											if (isNoiseActive) stopNoise();
											else startNoise(noiseType);
										}}
										className={`px-6 py-3 rounded-lg text-white font-semibold shadow-lg hover:scale-105 transition transform duration-200 ${
											isNoiseActive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
										}`}
									>
										{isNoiseActive ? "⏹ Stop" : "▶ Play"}
									</button>

									<div className="flex-grow flex items-center gap-2">
										<span className="text-xs text-slate-600">Vol:</span>
										<input
											type="range"
											min="0"
											max="1"
											step="0.1"
											value={noiseVolume}
											onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
											className="flex-grow cursor-pointer"
											disabled={!isNoiseActive}
										/>
										<span className="text-xs text-slate-600 w-10">{Math.round(noiseVolume * 100)}%</span>
									</div>
								</div>

								<button
									onClick={() => setShowNoisePanel(false)}
									className="w-full px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-slate-700 font-semibold transition"
								>
									Back
								</button>

								<div className="text-xs text-slate-500 p-2 bg-blue-50 rounded mt-3">
									💡 Tip: Start white noise at low volume and gradually increase for optimal focus.
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