import { useEffect, useState } from 'react'
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
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let active = true

    authApi.refreshSession().then(
      (session) => {
        if (active) applySession(session)
      },
      () => {
        if (active) clearSession()
      },
    )

    return () => {
      active = false
    }
  }, [])

  function applySession(session: AuthResponse) {
    setAccessToken(session.accessToken)
    setUser(session.user)
    setStatus('authenticated')
  }

  function clearSession() {
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
    clearSession()
    await authApi.logout().catch(() => undefined)
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
      }}
    >
      {children}
    </AuthContext>
  )
}
