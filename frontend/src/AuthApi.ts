import React from "react"

export default React.createContext<{
  auth: boolean
  setAuth: React.Dispatch<React.SetStateAction<boolean>>
} | null>(null)
