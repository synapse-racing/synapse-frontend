import { createContext } from 'react'
import type {
  AuthStatus,
  LoginInput,
  RegisterInput,
  User,
} from '../types/auth.ts'

export interface AuthContextValue {
  accessToken: string | null
  status: AuthStatus
  user: User | null
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
  renewSession: () => Promise<string>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
