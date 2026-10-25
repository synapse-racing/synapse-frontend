import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { MenuStage } from './MenuStage.tsx'
import { useMenuStage } from './menu-stage-context.ts'
import { defaults, PreferencesContext } from './preferences.ts'

const { disposed } = vi.hoisted(() => ({ disposed: vi.fn() }))
vi.mock('./ExhibitionBackdrop.tsx', () => ({
  ExhibitionBackdrop: ({
    theme,
    paused,
    calm,
  }: {
    theme: string
    paused: boolean
    calm: boolean
  }) => {
    useEffect(() => () => disposed(), [])
    return (
      <div
        data-testid="exhibition"
        data-theme={theme}
        data-paused={paused}
        data-calm={calm}
      />
    )
  },
}))

function TestMenu() {
  const { preview } = useMenuStage()
  return (
    <>
      <Link to="/login">Acceder</Link>
      <Link to="/training">Jugar</Link>
      <button onClick={() => preview('desert')}>Ver desierto</button>
    </>
  )
}
function Navigation() {
  return (
    <MemoryRouter>
      <Routes>
        <Route element={<MenuStage />}>
          <Route path="/" element={<TestMenu />} />
          <Route path="/login" element={<h1>Login</h1>} />
        </Route>
        <Route path="/training" element={<h1>Entrenamiento</h1>} />
      </Routes>
    </MemoryRouter>
  )
}

it('keeps the same backdrop and pause state while navigating to authentication', async () => {
  const user = userEvent.setup()
  render(<Navigation />)
  const backdrop = await screen.findByTestId('exhibition')
  await user.click(screen.getByRole('button', { name: 'Pausar exhibición' }))
  expect(backdrop).toHaveAttribute('data-paused', 'true')
  await user.click(screen.getByRole('link', { name: 'Acceder' }))
  expect(screen.getByTestId('exhibition')).toBe(backdrop)
  expect(backdrop).toHaveAttribute('data-calm', 'true')
  await user.click(screen.getByRole('button', { name: 'Reanudar exhibición' }))
  expect(backdrop).toHaveAttribute('data-paused', 'false')
})

it('switches previews and releases the background when entering a game', async () => {
  disposed.mockClear()
  const user = userEvent.setup()
  render(<Navigation />)
  await user.click(screen.getByRole('button', { name: 'Ver desierto' }))
  await waitFor(() =>
    expect(screen.getByTestId('exhibition')).toHaveAttribute(
      'data-theme',
      'desert',
    ),
  )
  await user.click(screen.getByRole('link', { name: 'Jugar' }))
  expect(
    screen.getByRole('heading', { name: 'Entrenamiento' }),
  ).toBeInTheDocument()
  expect(screen.queryByTestId('exhibition')).not.toBeInTheDocument()
  expect(disposed).toHaveBeenCalledOnce()
})

it('respects reduced motion and presents a static exhibition', async () => {
  render(
    <PreferencesContext
      value={{
        preferences: { ...defaults, reducedMotion: true },
        update: vi.fn(),
      }}
    >
      <Navigation />
    </PreferencesContext>,
  )
  expect(screen.getByText('Vista estática')).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Pausar exhibición' }),
  ).toBeDisabled()
  expect(await screen.findByTestId('exhibition')).toBeInTheDocument()
})
