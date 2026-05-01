"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface AuthContextType {
  isAuthenticated: boolean
  login: (_password: string) => boolean
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ADMIN_PASSWORD = "SantoAdmin2024!"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const authStatus = localStorage.getItem("catholic_admin_auth")
    const authTime = localStorage.getItem("catholic_admin_time")

    if (authStatus === "true" && authTime) {
      const loginTime = Number.parseInt(authTime)
      const currentTime = Date.now()
      if (currentTime - loginTime < 8 * 60 * 60 * 1000) {
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem("catholic_admin_auth")
        localStorage.removeItem("catholic_admin_time")
      }
    }
    setLoading(false)
  }, [])

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
      localStorage.setItem("catholic_admin_auth", "true")
      localStorage.setItem("catholic_admin_time", Date.now().toString())
      return true
    }
    return false
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem("catholic_admin_auth")
    localStorage.removeItem("catholic_admin_time")
  }

  return <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
