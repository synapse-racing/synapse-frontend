import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { MultiplayerPage } from './MultiplayerPage.tsx'
import type { RaceSnapshot, RoomState } from '../types/multiplayer.ts'

const { handlers, emit } = vi.hoisted(() => ({
  handlers: new Map<string, (payload: unknown) => void>(),
  emit: vi.fn(),
}))
vi.mock('../../auth/context/useAuth.ts', () => ({
  useAuth: () => ({ accessToken: 'token', user: { id: 'host' } }),
}))
vi.mock('../../training/api/training.api.ts', () => ({ listTrainingRuns: async () => [] }))
vi.mock('../api/multiplayer.socket.ts', () => ({
  connectMultiplayer: () => ({
    on: (event: string, handler: (payload: unknown) => void) => handlers.set(event, handler),
    emit, disconnect: vi.fn(),
  }),
}))
vi.mock('../components/MultiplayerRace.tsx', () => ({
  MultiplayerRace: ({ onReturnToRoom }: { onReturnToRoom: () => void }) => (
    <button onClick={onReturnToRoom}>Volver a la sala</button>
  ),
}))

it('returns from results to the existing lobby without leaving the room', async () => {
  const room: RoomState = {
    code: 'ABC123', hostUserId: 'host', status: 'RACING', maxPlayers: 2,
    track: { version: 'curved-loop-v1', seed: 99 },
    players: [{ userId: 'host', username: 'Host', ready: false, genomeName: 'Pilot' }],
  }
  const snapshot: RaceSnapshot = { serverTime: 100, startAt: 1, status: 'FINISHED', players: [] }
  render(<MemoryRouter><MultiplayerPage /></MemoryRouter>)
  await act(async () => {
    handlers.get('connection:ready')?.({})
    handlers.get('room:state')?.(room)
    handlers.get('race:snapshot')?.(snapshot)
    handlers.get('room:state')?.({ ...room, status: 'LOBBY' })
    handlers.get('race:finish')?.({ finishedAt: 100, players: [] })
  })
  await userEvent.click(screen.getByRole('button', { name: 'Volver a la sala' }))
  expect(screen.getByText('ABC123')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Parrilla de salida.' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Crear sala' })).not.toBeInTheDocument()
  expect(emit).not.toHaveBeenCalledWith('room:leave')
  await userEvent.click(screen.getByRole('button', { name: 'Estoy listo' }))
  expect(emit).toHaveBeenCalledWith('player:ready', { ready: true })
})
