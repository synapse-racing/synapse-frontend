import { apiRequest } from '../../../shared/api/http.ts'
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  User,
} from '../types/auth.ts'

let refreshRequest: Promise<AuthResponse> | null = null

export function register(input: RegisterInput) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function login(input: LoginInput) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function refreshSession() {
  if (!refreshRequest) {
    refreshRequest = apiRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',
    }).finally(() => {
      refreshRequest = null
    })
  }

  return refreshRequest
}

export function logout() {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}

export function getCurrentUser(accessToken: string) {
  return apiRequest<User>('/auth/me', { token: accessToken })
}
