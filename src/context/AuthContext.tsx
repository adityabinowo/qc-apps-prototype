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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthStateInterface>({
    user: null,
    hub: null,
    isAuthenticated: false,
  })

  const login = (user: UserInterface, hub: HubInterface) => {
    setAuth({ user, hub, isAuthenticated: true })
  }

  const logout = () => {
    setAuth({ user: null, hub: null, isAuthenticated: false })
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
