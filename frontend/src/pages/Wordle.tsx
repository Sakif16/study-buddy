import type React from "react"
import { useEffect, useState, useContext, useCallback } from "react"
import WordleGrid from "../components/WordleGrid"
import Keyboard from "../components/Keyboard"
import { WORD_LIST } from "../data/words"
import AuthApi from "../AuthApi"

const WARNING_THRESHOLD = 5

const getRandomWord = () => {
  if (WORD_LIST.length === 0) return "APPLE"
  const idx = Math.floor(Math.random() * WORD_LIST.length)
  return WORD_LIST[idx] ?? "APPLE"
}

const Wordle: React.FC = () => {
  // targetWord will be fetched from server when authenticated; otherwise fall back to local list
  const [targetWord, setTargetWord] = useState<string | null>(null)
  const [guesses, setGuesses] = useState<string[]>([])
  const [currentGuess, setCurrentGuess] = useState("")
  const [message, setMessage] = useState("")
  const [gamesPlayed, setGamesPlayed] = useState(0)
  const [serverMode, setServerMode] = useState(false) // true when using backend for user-specific words
  const authApi = useContext(AuthApi)

  // if user info is available from global session read, initialize gamesPlayed from it to avoid flicker
  useEffect(() => {
    if (authApi?.user && authApi?.auth) {
      setGamesPlayed(authApi.user.wordleGamesPlayed ?? 0)
    }
  }, [authApi?.user, authApi?.auth])

  const fetchServerTarget = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/api/wordle/target", {
        credentials: "include",
        signal: signal ?? null,
      })
      if (r.status === 401) {
        // not authenticated - fallback to local storage mode
        setServerMode(false)
        const today = new Date().toDateString()
        const stored = JSON.parse(localStorage.getItem("wordleData") || "{}")
        if (stored.date === today) {
          setGamesPlayed(stored.gamesPlayed || 0)
        } else {
          localStorage.setItem(
            "wordleData",
            JSON.stringify({ date: today, gamesPlayed: 0 }),
          )
        }
        setTargetWord(getRandomWord())
        return
      }

      const data = await r.json()
      if (data.success && data.targetWord) {
        setServerMode(true)
        setTargetWord(data.targetWord)
        setGamesPlayed(data.gamesPlayed ?? 0)
      } else {
        // fallback
        setServerMode(false)
        setTargetWord(getRandomWord())
      }
    } catch (err) {
      console.error("fetchServerTarget error", err)
      // whatever happens, fallback to local mode
      setServerMode(false)
      setTargetWord(getRandomWord())
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const onVisibility = () => {
      if (document.visibilityState === "visible" && authApi?.auth)
        fetchServerTarget()
    }

    // fetch whenever auth changes or the user identity changes (covers login / logout / account switch)
    if (authApi?.auth) fetchServerTarget(controller.signal)
    else {
      // unauthenticated: use local fallback
      setServerMode(false)
      const today = new Date().toDateString()
      const stored = JSON.parse(localStorage.getItem("wordleData") || "{}")
      if (stored.date === today) {
        setGamesPlayed(stored.gamesPlayed || 0)
      } else {
        localStorage.setItem(
          "wordleData",
          JSON.stringify({ date: today, gamesPlayed: 0 }),
        )
      }
      setTargetWord(getRandomWord())
    }

    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      controller.abort()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [authApi?.auth, fetchServerTarget])

  // re-fetch when the user identity changes (account switch) while staying logged in
  useEffect(() => {
    if (authApi?.user?.id) fetchServerTarget()
  }, [authApi?.user?.id, fetchServerTarget])

  const updatePlayCount = (count: number) => {
    if (serverMode) {
      // server mode: gamesPlayed is updated via /finish or /restart endpoints
      setGamesPlayed(count)
      return
    }

    const today = new Date().toDateString()
    localStorage.setItem(
      "wordleData",
      JSON.stringify({ date: today, gamesPlayed: count }),
    )
    setGamesPlayed(count)
  }

  const onKeyPress = (key: string) => {
    if (message.startsWith("You won") || message.startsWith("You lost")) return

    if (key === "ENTER") {
      if (currentGuess.length !== 5) {
        setMessage("Word must be 5 letters!")
        return
      }

      // Accept any 5-letter guess (don't require it to be in WORD_LIST)
      const newGuesses = [...guesses, currentGuess]
      setGuesses(newGuesses)
      setCurrentGuess("")
      setMessage("")

      if (currentGuess === targetWord) {
        setMessage("You won!")
        if (serverMode) {
          fetch("/api/wordle/finish", {
            method: "POST",
            credentials: "include",
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.success) setGamesPlayed(data.gamesPlayed)
            })
            .catch(() => {})
        } else {
          updatePlayCount(gamesPlayed + 1)
        }
      } else if (newGuesses.length === 6) {
        setMessage(`You lost! Word was ${targetWord}`)
        if (serverMode) {
          fetch("/api/wordle/finish", {
            method: "POST",
            credentials: "include",
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.success) setGamesPlayed(data.gamesPlayed)
            })
            .catch(() => {})
        } else {
          updatePlayCount(gamesPlayed + 1)
        }
      }
    } else if (key === "DEL") {
      setCurrentGuess(currentGuess.slice(0, -1))
    } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
      setCurrentGuess(currentGuess + key)
    }
  }

  // compute key status mapping based on guesses: present in target => green, guessed but absent => gray
  const keyStatus: Record<string, "green" | "gray"> = {}
  guesses.forEach((guess) => {
    for (const ch of guess.toUpperCase()) {
      if (!/^[A-Z]$/.test(ch)) continue
      if ((targetWord || "").toUpperCase().includes(ch)) {
        keyStatus[ch] = "green"
      } else {
        // only set to gray if not already green
        if (keyStatus[ch] !== "green") keyStatus[ch] = "gray"
      }
    }
  })

  const restartGame = () => {
    // If the game was already finished (win/lose), do not double-count the play
    if (message.startsWith("You won") || message.startsWith("You lost")) {
      setGuesses([])
      setCurrentGuess("")
      setMessage("")

      if (serverMode) {
        // server mode: ask the server to assign a new target for today WITHOUT consuming a play
        fetch("/api/wordle/new", { method: "POST", credentials: "include" })
          .then((r) => r.json())
          .then((data) => {
            if (data.success) {
              setTargetWord(data.targetWord)
              setGamesPlayed(data.gamesPlayed)
            } else if (data.message) {
              setMessage(data.message)
            }
          })
          .catch(() => setMessage("Restart failed"))
        return
      }

      setTargetWord(getRandomWord())
      return
    }

    // Consume one of the daily attempts when manually restarting mid-game
    if (serverMode) {
      fetch("/api/wordle/restart", { method: "POST", credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setTargetWord(data.targetWord)
            setGamesPlayed(data.gamesPlayed)
            setGuesses([])
            setCurrentGuess("")
            setMessage("")
          } else if (data.message) {
            setMessage(data.message)
          }
        })
        .catch(() => setMessage("Restart failed"))
      return
    }

    updatePlayCount(gamesPlayed + 1)
    setGuesses([])
    setCurrentGuess("")
    setMessage("")
    setTargetWord(getRandomWord())
  }

  if (targetWord === null) {
    return (
      <div className="flex flex-col items-center p-4">
        <h1 className="text-3xl font-bold mb-2">Wordle mini</h1>
        <p className="text-gray-600 mb-4">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-2">Wordle mini</h1>
      <div className="mb-4 w-full flex justify-center">
        {gamesPlayed > WARNING_THRESHOLD ? (
          <div className="bg-white text-black p-3 rounded shadow animate-pulse">
            You should be working now
          </div>
        ) : (
          <div className="h-8" />
        )}
      </div>
      <WordleGrid
        guesses={guesses}
        currentGuess={currentGuess}
        targetWord={targetWord}
      />
      <Keyboard onKeyPress={onKeyPress} keyStatus={keyStatus} />
      {message && <p className="mt-4 text-lg font-semibold">{message}</p>}
      <button
        onClick={restartGame}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Restart
      </button>
    </div>
  )
}

export default Wordle
