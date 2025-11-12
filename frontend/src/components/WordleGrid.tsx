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
  const totalRows = 6

  // Build exactly 6 rows: filled guesses, optional current guess row, then blanks
  const rowsToRender: { guess: string; isFinal: boolean; key: string }[] = []
  for (let i = 0; i < totalRows; i++) {
    if (i < guesses.length) {
      rowsToRender.push({
        guess: guesses[i] ?? "",
        isFinal: true,
        key: `guess-${i}`,
      })
    } else if (i === guesses.length && guesses.length < totalRows) {
      // current typing row
      rowsToRender.push({
        guess: currentGuess,
        isFinal: false,
        key: `current-${i}`,
      })
    } else {
      rowsToRender.push({ guess: "", isFinal: false, key: `empty-${i}` })
    }
  }

  return (
    <div className="grid grid-rows-6 gap-2">
      {rowsToRender.map((r) => (
        <WordRow
          key={r.key}
          guess={r.guess}
          targetWord={targetWord}
          isFinal={r.isFinal}
        />
      ))}
    </div>
  )
}

export default WordleGrid
