import type React from "react"

interface WordRowProps {
  guess: string
  targetWord: string
  isFinal: boolean
}

const getCellColor = (letter: string, index: number, target: string) => {
  if (!letter) return "bg-gray-200"
  if (target[index] === letter) return "bg-green-500 text-white"
  if (target.includes(letter)) return "bg-yellow-500 text-white"
  return "bg-gray-400 text-white"
}

const WordRow: React.FC<WordRowProps> = ({ guess, targetWord, isFinal }) => {
  const letters = guess.split("")

  return (
    <div className="flex justify-center gap-2">
      {Array(5)
        .fill(null)
        .map((_, i) => (
          <div
            key={`${guess}-${i}`}
            className={`w-14 h-14 flex items-center justify-center text-2xl font-bold rounded ${
              isFinal
                ? getCellColor(letters[i] ?? "", i, targetWord)
                : "bg-gray-200"
            }`}
          >
            {letters[i] || ""}
          </div>
        ))}
    </div>
  )
}

export default WordRow
