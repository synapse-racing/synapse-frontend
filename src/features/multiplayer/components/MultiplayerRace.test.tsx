import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { MultiplayerRace } from './MultiplayerRace.tsx'
import type { RemoteRaceCar } from './RemoteRaceCar.tsx'
import type { RacePlayerState } from '../types/multiplayer.ts'

vi.mock('../../../shared/three/SceneCanvas.tsx', () => ({
  SceneCanvas: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('../../../shared/three/TrackEnvironment.tsx', () => ({
  TrackEnvironment: () => null,
}))
vi.mock('../../../shared/three/RaceCamera.tsx', () => ({
  RaceCamera: ({ mode }: { mode: string }) => (
    <output aria-label="Cámara">{mode}</output>
  ),
}))
vi.mock('./RemoteRaceCar.tsx', () => ({
  RemoteRaceCar: ({
    player,
    onSelect,
  }: ComponentProps<typeof RemoteRaceCar>) => (
    <button onClick={() => onSelect?.(player.userId)}>
      Auto {player.username}
    </button>
  ),
}))

function props(): ComponentProps<typeof MultiplayerRace> {
  const players: RacePlayerState[] = ['host', 'guest'].map((id, i) => ({
    userId: id,
    username: id,
    x: i,
    z: 0,
    yaw: 0,
    speed: 4,
    expectedCheckpoint: 0,
    passedCheckpoints: 0,
    laps: 0,
    finishedAt: null,
    disconnected: false,
    eliminated: false,
    eliminationReason: null,
    rank: i + 1,
  }))
  return {
    onTimeScaleChange: vi.fn(),
    onEliminateCar: vi.fn(),
    onLeave: vi.fn(),
    onReturnToRoom: vi.fn(),
    controlsDisabled: false,
    error: null,
    currentUserId: 'host',
    result: null,
    room: {
      code: 'TEST',
      hostUserId: 'host',
      timeScale: 1,
      status: 'RACING',
      maxPlayers: 2,
      track: { version: 'grand-prix-v3', seed: 42 },
      players: players.map((p) => ({
        userId: p.userId,
        username: p.username,
        ready: true,
        genomeName: 'Test',
      })),
    },
    snapshot: { serverTime: 5000, startAt: 4000, status: 'RACING', players },
  }
}

it('lets the host follow and eliminate a car only in the active race', () => {
  const input = props()
  const view = render(<MultiplayerRace {...input} />)
  fireEvent.click(screen.getByRole('button', { name: 'Auto guest' }))
  expect(screen.getByLabelText('Cámara')).toHaveTextContent('follow')
  expect(screen.getByLabelText('Observar')).toHaveValue('guest')
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar auto' }))
  expect(input.onEliminateCar).toHaveBeenCalledWith('guest', 4000)
  expect(screen.getByLabelText('Cámara')).toHaveTextContent('follow')
  input.snapshot = {
    ...input.snapshot,
    players: input.snapshot.players.map((p) =>
      p.userId === 'guest'
        ? { ...p, eliminated: true, eliminationReason: 'HOST' }
        : p,
    ),
  }
  view.rerender(<MultiplayerRace {...input} />)
  expect(screen.getByLabelText('Cámara')).toHaveTextContent('free')
  expect(screen.getByRole('button', { name: 'Eliminar auto' })).toBeDisabled()
  expect(screen.getByLabelText('Opciones de guest')).toHaveTextContent(
    'Eliminado por el anfitrión',
  )
  view.rerender(
    <MultiplayerRace
      {...input}
      snapshot={{ ...input.snapshot, startAt: 10000 }}
    />,
  )
  expect(screen.queryByLabelText('Opciones de guest')).not.toBeInTheDocument()
})

it('lets any player follow, exposing elimination only after becoming host', () => {
  const input = props()
  input.currentUserId = 'guest'
  const view = render(<MultiplayerRace {...input} />)
  fireEvent.click(screen.getByRole('button', { name: 'Seguir a host' }))
  expect(screen.getByLabelText('Cámara')).toHaveTextContent('follow')
  expect(screen.getByLabelText('Observar')).toHaveValue('host')
  expect(
    screen.queryByRole('button', { name: 'Eliminar auto' }),
  ).not.toBeInTheDocument()
  view.rerender(
    <MultiplayerRace
      {...input}
      room={{ ...input.room, hostUserId: 'guest' }}
    />,
  )
  expect(screen.getByRole('button', { name: 'Eliminar auto' })).toBeEnabled()
  view.rerender(
    <MultiplayerRace
      {...input}
      room={{ ...input.room, hostUserId: 'guest' }}
      snapshot={{ ...input.snapshot, status: 'COUNTDOWN' }}
    />,
  )
  expect(screen.getByRole('button', { name: 'Eliminar auto' })).toBeDisabled()
})

it('releases a spectator camera when the host eliminates the followed car', () => {
  const input = props()
  input.currentUserId = 'guest'
  const view = render(<MultiplayerRace {...input} />)
  fireEvent.click(screen.getByRole('button', { name: 'Seguir a host' }))
  view.rerender(
    <MultiplayerRace
      {...input}
      snapshot={{
        ...input.snapshot,
        players: input.snapshot.players.map((p) =>
          p.userId === 'host'
            ? { ...p, eliminated: true, eliminationReason: 'HOST' }
            : p,
        ),
      }}
    />,
  )
  expect(screen.getByLabelText('Cámara')).toHaveTextContent('free')
  fireEvent.click(screen.getByRole('button', { name: 'Seguir piloto' }))
  expect(screen.getByLabelText('Cámara')).toHaveTextContent('follow')
})

it('releases a spectator camera when the followed car collides', () => {
  const input = props()
  input.currentUserId = 'guest'
  const view = render(<MultiplayerRace {...input} />)
  fireEvent.click(screen.getByRole('button', { name: 'Seguir a host' }))
  view.rerender(
    <MultiplayerRace
      {...input}
      snapshot={{
        ...input.snapshot,
        players: input.snapshot.players.map((p) =>
          p.userId === 'host'
            ? { ...p, eliminated: true, eliminationReason: 'COLLISION' }
            : p,
        ),
      }}
    />,
  )
  expect(screen.getByLabelText('Cámara')).toHaveTextContent('free')
})
