import { act, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import {
  AuthContext,
  type AuthContextValue,
} from '../../auth/context/auth-context.ts'
import { AppearanceProvider } from './AppearanceProvider.tsx'
import {
  useAppearance,
  type AppearanceContextValue,
} from './appearance-context.ts'
import { defaultAppearance } from '../domain/appearance.ts'
import { guestAppearanceKey } from '../persistence/guest-appearance.ts'
import { ApiError } from '../../../shared/api/http.ts'
import { getAppearance, saveAppearance } from '../api/appearance.api.ts'

vi.mock('../api/appearance.api.ts', () => ({
  getAppearance: vi.fn(),
  saveAppearance: vi.fn(),
}))
const blue = { ...defaultAppearance, primaryColor: '#387bef', number: 23 }
const red = { ...defaultAppearance, primaryColor: '#d94149', number: 42 }
let garage: AppearanceContextValue
function Probe() {
  garage = useAppearance()
  return null
}
function account(id?: string): AuthContextValue {
  return {
    status: id ? 'authenticated' : 'visitor',
    accessToken: id ? `token-${id}` : null,
    user: id
      ? {
          id,
          email: `${id}@example.test`,
          username: id,
          createdAt: '',
          updatedAt: '',
        }
      : null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    continueAsGuest: vi.fn(),
    renewSession: vi.fn().mockResolvedValue('renewed'),
  }
}
function mount(auth = account()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const tree = (value: AuthContextValue) => (
    <QueryClientProvider client={client}>
      <AuthContext value={value}>
        <AppearanceProvider>
          <Probe />
        </AppearanceProvider>
      </AuthContext>
    </QueryClientProvider>
  )
  const view = render(tree(auth))
  return {
    ...view,
    switchAccount: (value: AuthContextValue) => view.rerender(tree(value)),
  }
}
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})
afterEach(() => vi.restoreAllMocks())

it('only equips applied guest designs and restores them after remount', async () => {
  const first = mount()
  act(() => garage.preview(blue))
  expect(garage.displayAppearance).toEqual(blue)
  expect(garage.appearance).toEqual(defaultAppearance)
  expect(localStorage.getItem(guestAppearanceKey)).toBeNull()
  act(() => garage.preview(null))
  expect(garage.displayAppearance).toEqual(defaultAppearance)
  await act(() => garage.save(blue))
  first.unmount()
  mount()
  expect(garage.appearance).toEqual(blue)
  expect(saveAppearance).not.toHaveBeenCalled()
})

it('keeps the equipped design and draft when local persistence fails', async () => {
  mount()
  act(() => garage.preview(blue))
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Quota exceeded')
  })
  await act(async () => {
    await expect(garage.save(blue)).rejects.toThrow('No se pudo guardar')
  })
  expect(garage.appearance).toEqual(defaultAppearance)
  expect(garage.displayAppearance).toEqual(blue)
  expect(garage.saving).toBe(false)
})

it('ignores malformed local data and does not overwrite an account with a guest design', async () => {
  localStorage.setItem(guestAppearanceKey, '{broken')
  const first = mount()
  expect(garage.appearance).toEqual(defaultAppearance)
  first.unmount()
  localStorage.setItem(guestAppearanceKey, JSON.stringify(blue))
  vi.mocked(getAppearance).mockResolvedValue({
    appearance: red,
    customized: true,
  })
  mount(account('a'))
  await waitFor(() => expect(garage.loading).toBe(false))
  expect(garage.appearance).toEqual(red)
  expect(garage.guestAppearance).toEqual(blue)
  expect(saveAppearance).not.toHaveBeenCalled()
})

it('isolates previews and late successful saves when switching accounts', async () => {
  vi.mocked(getAppearance).mockImplementation(async (token) => ({
    appearance: token === 'token-a' ? defaultAppearance : red,
    customized: true,
  }))
  let finish!: (value: { appearance: typeof blue; customized: boolean }) => void
  vi.mocked(saveAppearance).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const view = mount(account('a'))
  await waitFor(() => expect(garage.loading).toBe(false))
  act(() => garage.preview(blue))
  let pending!: Promise<void>
  act(() => {
    pending = garage.save(blue)
  })
  view.switchAccount(account('b'))
  await waitFor(() => expect(garage.appearance).toEqual(red))
  expect(garage.displayAppearance).toEqual(red)
  await act(async () => {
    finish({ appearance: blue, customized: true })
    await pending
  })
  expect(garage.appearance).toEqual(red)
  expect(saveAppearance).toHaveBeenCalledExactlyOnceWith('token-a', blue)
})

it('does not renew an old request using another account session', async () => {
  vi.mocked(getAppearance).mockResolvedValue({
    appearance: defaultAppearance,
    customized: false,
  })
  let fail!: (reason: Error) => void
  vi.mocked(saveAppearance).mockReturnValue(
    new Promise((_, reject) => {
      fail = reject
    }),
  )
  const auth = account('a')
  const view = mount(auth)
  await waitFor(() => expect(garage.loading).toBe(false))
  let pending!: Promise<void>
  act(() => {
    pending = garage.save(blue)
  })
  view.switchAccount(account('b'))
  await act(async () => {
    fail(new ApiError('Expired', 401))
    await expect(pending).rejects.toThrow('La sesión cambió')
  })
  expect(auth.renewSession).not.toHaveBeenCalled()
  expect(saveAppearance).toHaveBeenCalledTimes(1)
})
