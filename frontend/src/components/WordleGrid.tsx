import type React from "react"
import WordRow from "./WordRow"

interface WordleGridProps {
  guesses: string[]
  currentGuess: string
  targetWord: string
}

const WordleGrid: React.FC<WordleGridProps> = ({
  guesses,
  currentGuess,
  targetWord,
}) => {
  const rows = [...guesses]
  const emptyRows = Array(6 - rows.length - 1).fill("")

  return (
    <div className="grid grid-rows-6 gap-2">
      {rows.map((guess, i) => (
        <WordRow key={i} guess={guess} targetWord={targetWord} isFinal={true} />
      ))}
      {guesses.length < 6 && (
        <WordRow guess={currentGuess} targetWord={targetWord} isFinal={false} />
      )}
      {emptyRows.map((_, i) => (
        <WordRow
          key={`empty-${i}`}
          guess=""
          targetWord={targetWord}
          isFinal={false}
        />
      ))}
    </div>
  )
}

export default WordleGrid
