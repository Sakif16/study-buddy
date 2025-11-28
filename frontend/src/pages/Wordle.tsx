import type React from "react"
import { useEffect, useState } from "react"
import WordleGrid from "../components/WordleGrid"
import Keyboard from "../components/Keyboard"
import { WORD_LIST } from "../data/words"

const MAX_GAMES_PER_DAY = 5

const getRandomWord = () =>
  WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)]

const Wordle: React.FC = () => {
  const [targetWord, setTargetWord] = useState(getRandomWord)
  const [guesses, setGuesses] = useState<string[]>([])
  const [currentGuess, setCurrentGuess] = useState("")
  const [message, setMessage] = useState("")
  const [gamesPlayed, setGamesPlayed] = useState(0)

  useEffect(() => {
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
  }, [])

  const updatePlayCount = (count: number) => {
    const today = new Date().toDateString()
    localStorage.setItem(
      "wordleData",
      JSON.stringify({ date: today, gamesPlayed: count }),
    )
    setGamesPlayed(count)
  }

  const onKeyPress = (key: string) => {
    if (gamesPlayed >= MAX_GAMES_PER_DAY) {
      setMessage("You've reached your daily limit! Try again tomorrow.")
      return
    }
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
        updatePlayCount(gamesPlayed + 1)
      } else if (newGuesses.length === 6) {
        setMessage(`You lost! Word was ${targetWord}`)
        updatePlayCount(gamesPlayed + 1)
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
    if (gamesPlayed >= MAX_GAMES_PER_DAY) {
      setMessage("You've reached your daily limit!")
      return
    }

    // If the game was already finished (win/lose), do not double-count the play
    if (message.startsWith("You won") || message.startsWith("You lost")) {
      setGuesses([])
      setCurrentGuess("")
      setMessage("")
      setTargetWord(getRandomWord())
      return
    }

    // Consume one of the daily attempts when manually restarting mid-game
    updatePlayCount(gamesPlayed + 1)
    setGuesses([])
    setCurrentGuess("")
    setMessage("")
    setTargetWord(getRandomWord())
  }

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-2">Wordle mini</h1>
      <p className="text-gray-600 mb-4">
        Games played today: {gamesPlayed}/{MAX_GAMES_PER_DAY}
      </p>
      <WordleGrid
        guesses={guesses}
        currentGuess={currentGuess}
        targetWord={targetWord!}
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
