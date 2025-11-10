import type React from "react"
import { useEffect } from "react"

interface KeyboardProps {
  onKeyPress: (key: string) => void
}

const KEYS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DEL"],
]

const Keyboard: React.FC<KeyboardProps> = ({ onKeyPress }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase()

      // Handle regular letters
      if (/^[A-Z]$/.test(key)) {
        onKeyPress(key)
      }
      // Handle Backspace/Delete
      else if (key === "BACKSPACE" || key === "DELETE") {
        onKeyPress("DEL")
      }
      // Handle Enter
      else if (key === "ENTER") {
        onKeyPress("ENTER")
      }
    }

    // Add keyboard listener
    window.addEventListener("keydown", handleKeyDown)

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onKeyPress])

  return (
    <div className="mt-4 flex flex-col gap-2 items-center">
      {KEYS.map((row, i) => (
        <div key={i} className="flex gap-1">
          {row.map((key) => (
            <button
              key={key}
              className="px-3 py-2 bg-gray-300 rounded text-sm font-bold hover:bg-gray-400"
              onClick={() => onKeyPress(key)}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

export default Keyboard
