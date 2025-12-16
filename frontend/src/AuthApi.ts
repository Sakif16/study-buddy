import React from "react"

export default React.createContext<{
  auth: boolean
  setAuth: React.Dispatch<React.SetStateAction<boolean>>
  user: null | { id: string; username: string; name?: string | null }
  setUser: React.Dispatch<
    React.SetStateAction<null | {
      id: string
      username: string
      name?: string | null
    }>
  >
} | null>(null)
