import { useEffect, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import * as authApi from '../api/auth.api.ts'
import type {
  AuthResponse,
  AuthStatus,
  LoginInput,
  RegisterInput,
  User,
} from '../types/auth.ts'
import { AuthContext } from './auth-context.ts'

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>(() => {
    try {
      return localStorage.getItem('synapse-visitor') === 'true'
        ? 'visitor'
        : 'loading'
    } catch {
      return 'loading'
    }
  })
  const sessionVersion = useRef(0)
  const startedAsVisitor = useRef(status === 'visitor')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (startedAsVisitor.current) return
    let active = true
    const version = sessionVersion.current

    authApi.refreshSession().then(
      (session) => {
        if (active && version === sessionVersion.current) applySession(session)
      },
      () => {
        if (active && version === sessionVersion.current) clearSession()
      },
    )

    return () => {
      active = false
    }
  }, [])

  function applySession(session: AuthResponse) {
    sessionVersion.current += 1
    try {
      localStorage.removeItem('synapse-visitor')
    } catch {
      /* Optional preference. */
    }
    setAccessToken(session.accessToken)
    setUser(session.user)
    setStatus('authenticated')
  }

  function clearSession() {
    sessionVersion.current += 1
    try {
      localStorage.removeItem('synapse-visitor')
    } catch {
      /* Optional preference. */
    }
    setAccessToken(null)
    setUser(null)
    setStatus('guest')
  }

  async function login(input: LoginInput) {
    applySession(await authApi.login(input))
  }

  async function register(input: RegisterInput) {
    applySession(await authApi.register(input))
  }

  async function logout() {
    const authenticated = status === 'authenticated'
    clearSession()
    if (authenticated) await authApi.logout().catch(() => undefined)
  }

  function continueAsGuest() {
    sessionVersion.current += 1
    try {
      localStorage.setItem('synapse-visitor', 'true')
    } catch {
      /* IndexedDB reports any save failures separately. */
    }
    setAccessToken(null)
    setUser(null)
    setStatus('visitor')
  }

  async function renewSession() {
    const session = await authApi.refreshSession()
    applySession(session)
    return session.accessToken
  }

  return (
    <AuthContext
      value={{
        accessToken,
        status,
        user,
        login,
        register,
        logout,
        renewSession,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext>
  )
}
