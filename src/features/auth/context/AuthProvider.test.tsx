import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/auth.api.ts'
import type { AuthResponse } from '../types/auth.ts'
import { AuthProvider } from './AuthProvider.tsx'
import type { AuthContextValue } from './auth-context.ts'
import { useAuth } from './useAuth.ts'

vi.mock('../api/auth.api.ts', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
}))

const accountA: AuthResponse = {
  accessToken: 'token-a',
  user: {
    id: 'account-a',
    email: 'a@example.test',
    username: 'Driver A',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
}
const accountB: AuthResponse = {
  accessToken: 'token-b',
  user: {
    ...accountA.user,
    id: 'account-b',
    email: 'b@example.test',
    username: 'Driver B',
  },
}
let auth: AuthContextValue

function Probe() {
  auth = useAuth()
  return null
}

function pendingRefresh() {
  let resolve!: (session: AuthResponse) => void
  vi.mocked(authApi.refreshSession).mockReturnValue(
    new Promise((finish) => {
      resolve = finish
    }),
  )
  let result!: Promise<string>
  act(() => {
    result = auth.renewSession()
  })
  return { resolve, result }
}

async function authenticate() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
  expect(auth.status).toBe('visitor')
  expect(authApi.refreshSession).not.toHaveBeenCalled()
  await act(() =>
    auth.login({ email: accountA.user.email, password: 'test-password' }),
  )
  expect(auth.status).toBe('authenticated')
  expect(auth.user?.id).toBe(accountA.user.id)
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  localStorage.setItem('synapse-visitor', 'true')
  vi.mocked(authApi.login).mockResolvedValue(accountA)
  vi.mocked(authApi.logout).mockResolvedValue(undefined)
})

describe('session renewal isolation', () => {
  it('applies a renewed token and profile for the same account', async () => {
    await authenticate()
    const refreshed = {
      accessToken: 'renewed-a',
      user: { ...accountA.user, username: 'Updated driver' },
    }
    vi.mocked(authApi.refreshSession).mockResolvedValue(refreshed)

    await act(async () => {
      await expect(auth.renewSession()).resolves.toBe('renewed-a')
    })

    expect(auth.status).toBe('authenticated')
    expect(auth.accessToken).toBe('renewed-a')
    expect(auth.user).toEqual(refreshed.user)
    expect(authApi.refreshSession).toHaveBeenCalledTimes(1)
  })

  it('does not restore an account when a pending refresh finishes after logout', async () => {
    await authenticate()
    const pending = pendingRefresh()
    await act(() => auth.logout())
    expect(auth.status).toBe('guest')

    await act(async () => {
      pending.resolve({ ...accountA, accessToken: 'late-a' })
      await expect(pending.result).rejects.toThrow('La sesión cambió')
    })

    expect(auth.status).toBe('guest')
    expect(auth.user).toBeNull()
    expect(auth.accessToken).toBeNull()
    expect(authApi.logout).toHaveBeenCalledTimes(1)
  })

  it('rejects a refresh response belonging to another account', async () => {
    await authenticate()
    vi.mocked(authApi.refreshSession).mockResolvedValue(accountB)

    await act(async () => {
      await expect(auth.renewSession()).rejects.toThrow('La sesión cambió')
    })

    expect(auth.status).toBe('authenticated')
    expect(auth.user).toEqual(accountA.user)
    expect(auth.accessToken).toBe(accountA.accessToken)
  })

  it('keeps the new account when a previous account refresh resolves late', async () => {
    await authenticate()
    const pending = pendingRefresh()
    vi.mocked(authApi.login).mockResolvedValue(accountB)
    await act(() =>
      auth.login({ email: accountB.user.email, password: 'test-password' }),
    )

    await act(async () => {
      pending.resolve({ ...accountA, accessToken: 'late-a' })
      await expect(pending.result).rejects.toThrow('La sesión cambió')
    })

    expect(auth.status).toBe('authenticated')
    expect(auth.user).toEqual(accountB.user)
    expect(auth.accessToken).toBe(accountB.accessToken)
  })
})
