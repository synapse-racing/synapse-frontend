import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { AppProviders } from './app/providers.tsx'
import { IDBFactory } from 'fake-indexeddb'
import {
  createGuestRun,
  getGuestTraining,
  listGuestRuns,
  saveGuestCheckpoint,
} from './features/training/persistence/guest-training.ts'
import { NeatPopulation } from './features/training/neat/population.ts'
import { defaultAppearance } from './features/garage/domain/appearance.ts'
vi.mock('./shared/game/ExhibitionBackdrop.tsx', () => ({
  ExhibitionBackdrop: () => <div data-testid="exhibition-canvas" />,
}))
vi.mock('./features/garage/components/GarageBackdrop.tsx', () => ({
  GarageBackdrop: () => <div data-testid="garage-canvas" />,
}))

const authenticatedUser = {
  id: '5d9e1ffc-c86a-49af-92a6-e78dbb2fb92a',
  email: 'driver@example.com',
  username: 'driver_one',
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('authentication navigation', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    vi.stubGlobal('indexedDB', new IDBFactory())
  })

  it('shows the title and opens login when a guest presses Enter', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ message: 'Invalid session' }, 401)),
    )

    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )

    const enter = await screen.findByRole('button', { name: /Presiona Enter/ })
    const exhibition = await screen.findByTestId('exhibition-canvas')
    expect(enter).toBeEnabled()
    await userEvent.keyboard('{Enter}')
    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesion' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('exhibition-canvas')).toBe(exhibition)
  })

  it('opens the dashboard after a valid login', async () => {
    window.history.replaceState({}, '', '/login')
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse({ message: 'Invalid session' }, 401)
      }
      if (url.endsWith('/users/me/appearance'))
        return jsonResponse({
          appearance: defaultAppearance,
          customized: false,
        })

      return jsonResponse({
        accessToken: 'access-token',
        user: authenticatedUser,
      })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )

    await user.type(
      await screen.findByLabelText('Correo'),
      'driver@example.com',
    )
    await user.type(screen.getByLabelText('Contrasena'), 'secure-pass-123')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(
      await screen.findByRole('heading', {
        name: /A LA\s*PISTA/,
      }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/users/me/appearance'),
      expect.any(Object),
    )
  })

  it('continues to the paddock when the session is restored', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse({ accessToken: 'access-token', user: authenticatedUser }),
      ),
    )
    const user = userEvent.setup()
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )
    await user.click(
      await screen.findByRole('button', { name: /Presiona Enter/ }),
    )
    expect(
      await screen.findByRole('navigation', { name: 'Modos de juego' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Iniciar sesion' }),
    ).not.toBeInTheDocument()
    const training = screen.getByRole('link', { name: /ENTRENAMIENTO/ })
    training.focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('link', { name: /MULTIJUGADOR/ })).toHaveFocus()
  })

  it('enters as a guest while session restoration is pending and survives reload without the API', async () => {
    window.history.replaceState({}, '', '/login')
    let completeRefresh!: (response: Response) => void
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          completeRefresh = resolve
        }),
    )
    vi.stubGlobal('fetch', fetch)
    const first = render(
      <AppProviders>
        <App />
      </AppProviders>,
    )
    await userEvent.click(
      await screen.findByRole('button', { name: /Continuar como invitado/ }),
    )
    expect(await screen.findByText(/Piloto invitado/)).toBeInTheDocument()
    await act(async () => completeRefresh(new Response('{}', { status: 401 })))
    expect(screen.getByText(/Piloto invitado/)).toBeInTheDocument()
    first.unmount()
    fetch.mockClear()
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )
    expect(await screen.findByText(/Piloto invitado/)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('link', { name: /MULTIJUGADOR/ }))
    expect(
      await screen.findByRole('heading', { name: 'Compite con una cuenta.' }),
    ).toBeInTheDocument()
  })

  it('preserves guest progress through registration and retries a failed account import', async () => {
    const engine = new NeatPopulation(42, {
      populationSize: 6,
      track: { version: 'grand-prix-v3', seed: 42 },
    })
    const run = await createGuestRun({
      name: 'Guest season',
      seed: 42,
      config: engine.config,
    })
    const metrics = engine.evolve(
      new Map(engine.genomes.map((g, i) => [g.id, 10 + i])),
    )
    await saveGuestCheckpoint(run.id, {
      ...metrics,
      generation: 1,
      snapshot: engine.toSnapshot(),
      bestGenome: engine.genomes[0],
      durationMs: 1000,
    })
    localStorage.setItem('synapse-visitor', 'true')
    window.history.replaceState({}, '', '/dashboard')
    let attempts = 0
    const fetch = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/auth/register'))
        return jsonResponse({
          accessToken: 'account-token',
          user: authenticatedUser,
        })
      if (url.endsWith('/training-runs/import-guest')) {
        attempts++
        return attempts === 1
          ? jsonResponse({ message: 'Offline' }, 503)
          : jsonResponse({ id: 'imported' }, 201)
      }
      return jsonResponse({ message: 'Invalid session' }, 401)
    })
    vi.stubGlobal('fetch', fetch)
    const user = userEvent.setup()
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )
    await user.click(
      await screen.findByRole('link', {
        name: /Crear cuenta y guardar progreso/,
      }),
    )
    await user.type(screen.getByLabelText('Nombre de usuario'), 'driver_one')
    await user.type(screen.getByLabelText('Correo'), 'driver@example.com')
    await user.type(screen.getByLabelText('Contrasena'), 'secure-pass-123')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'siguen en este dispositivo',
    )
    expect((await getGuestTraining(run.id)).checkpoint.generation).toBe(1)
    await user.click(
      screen.getByRole('button', { name: 'Reintentar guardado' }),
    )
    expect(
      await screen.findByText('Tu progreso ya está guardado en tu cuenta.'),
    ).toBeInTheDocument()
    await waitFor(async () => expect(await listGuestRuns()).toEqual([]))
    expect(attempts).toBe(2)
  })
})
