import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { MenuStage } from './MenuStage.tsx'
import { useMenuStage } from './menu-stage-context.ts'
import {
  defaults,
  PreferencesContext,
  useGamePreferences,
} from './preferences.ts'
import { GamePreferences } from './GamePreferences.tsx'

const { disposed } = vi.hoisted(() => ({ disposed: vi.fn() }))
vi.mock('./ExhibitionBackdrop.tsx', () => ({
  ExhibitionBackdrop: ({
    theme,
    paused,
    calm,
    reduced,
  }: {
    theme: string
    paused: boolean
    calm: boolean
    reduced: boolean
  }) => {
    useEffect(() => () => disposed(), [])
    return (
      <div
        data-testid="exhibition"
        data-theme={theme}
        data-paused={paused}
        data-calm={calm}
        data-reduced={reduced}
      />
    )
  },
}))

function TestMenu() {
  const { preview } = useMenuStage()
  const { update } = useGamePreferences()
  return (
    <>
      <Link to="/login">Acceder</Link>
      <Link to="/training">Jugar</Link>
      <button onClick={() => preview('desert')}>Ver desierto</button>
      <button onClick={() => update({ pauseMenuAnimation: true })}>
        Pausar fondo
      </button>
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
  render(
    <GamePreferences>
      <Navigation />
    </GamePreferences>,
  )
  const backdrop = await screen.findByTestId('exhibition')
  await user.click(screen.getByRole('button', { name: 'Pausar fondo' }))
  expect(backdrop).toHaveAttribute('data-paused', 'true')
  await user.click(screen.getByRole('link', { name: 'Acceder' }))
  expect(screen.getByTestId('exhibition')).toBe(backdrop)
  expect(backdrop).toHaveAttribute('data-calm', 'true')
  expect(backdrop).toHaveAttribute('data-paused', 'true')
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

it('reduces camera movement without pausing the race or showing the exhibition panel', async () => {
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
  const backdrop = await screen.findByTestId('exhibition')
  expect(backdrop).toHaveAttribute('data-reduced', 'true')
  expect(backdrop).toHaveAttribute('data-paused', 'false')
  expect(
    screen.queryByLabelText('Controles de exhibición'),
  ).not.toBeInTheDocument()
})
