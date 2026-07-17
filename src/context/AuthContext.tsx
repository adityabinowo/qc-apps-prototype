import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import type { AuthStateInterface, HubInterface, UserInterface } from '../lib/types'

interface AuthContextType {
  auth: AuthStateInterface
  login: (user: UserInterface, hub: HubInterface) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)
const STORAGE_KEY = 'qc_auth'

function loadStoredAuth(): AuthStateInterface {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AuthStateInterface
  } catch {
    // corrupted or unavailable storage -- fall back to logged-out
  }
  return { user: null, hub: null, isAuthenticated: false }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthStateInterface>(loadStoredAuth)

  const login = (user: UserInterface, hub: HubInterface) => {
    const next: AuthStateInterface = { user, hub, isAuthenticated: true }
    setAuth(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const logout = () => {
    setAuth({ user: null, hub: null, isAuthenticated: false })
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
