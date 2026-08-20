export interface User {
  id: string
  email: string
  username: string
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput extends LoginInput {
  username: string
}

export type AuthStatus = 'loading' | 'authenticated' | 'guest'
