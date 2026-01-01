import React from "react"

export default React.createContext<{
  auth: boolean
  setAuth: React.Dispatch<React.SetStateAction<boolean>>
  admin: boolean
  setAdmin: React.Dispatch<React.SetStateAction<boolean>>
  user: null | {
    id: string
    username: string
    name?: string | null
    wordleDate?: string | null
    wordleGamesPlayed?: number
  }
  setUser: React.Dispatch<
    React.SetStateAction<null | {
      id: string
      username: string
      name?: string | null
      wordleDate?: string | null
      wordleGamesPlayed?: number
    }>
  >
} | null>(null)
