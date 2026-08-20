import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { AppProviders } from './app/providers.tsx'

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
  })

  it('redirects a guest to login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ message: 'Invalid session' }, 401)),
    )

    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Iniciar sesion' }),
    ).toBeInTheDocument()
  })

  it('opens the dashboard after a valid login', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = input.toString()
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse({ message: 'Invalid session' }, 401)
      }

      return jsonResponse({ accessToken: 'access-token', user: authenticatedUser })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(
      <AppProviders>
        <App />
      </AppProviders>,
    )

    await user.type(await screen.findByLabelText('Correo'), 'driver@example.com')
    await user.type(screen.getByLabelText('Contrasena'), 'secure-pass-123')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Elige tu siguiente carrera.',
      }),
    ).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
