import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RoomState } from '../types/multiplayer.ts'
import { MultiplayerLobby } from './MultiplayerLobby.tsx'

const room: RoomState = {
  code: 'ABC123',
  hostUserId: 'host',
  status: 'LOBBY',
  maxPlayers: 4,
  track: { version: 'rectangular-ring-v1', seed: 42_170 },
  players: [
    { userId: 'host', username: 'Host', ready: true, genomeName: 'Host AI' },
    { userId: 'guest', username: 'Guest', ready: false, genomeName: 'Guest AI' },
  ],
}

describe('MultiplayerLobby', () => {
  it('shows players and toggles current player ready state', async () => {
    const onReady = vi.fn()
    const user = userEvent.setup()

    render(
      <MultiplayerLobby
        busy={false}
        currentUserId="guest"
        error={null}
        onCreate={vi.fn()}
        onJoin={vi.fn()}
        onLeave={vi.fn()}
        onReady={onReady}
        onSelectGenome={vi.fn()}
        onSelectTrack={vi.fn()}
        onStart={vi.fn()}
        room={room}
        trainingRuns={[
          {
            id: 'run-1',
            name: 'Guest AI',
            status: 'PAUSED',
            seed: 1,
            currentGeneration: 2,
            bestFitness: 10,
            config: { simulationVersion: 'race-sim-v1' } as never,
            createdAt: '',
            updatedAt: '',
            startedAt: null,
            finishedAt: null,
          },
        ]}
      />,
    )

    expect(screen.getByText('ABC123')).toBeInTheDocument()
    expect(screen.getByText('Guest')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Estoy listo' }))
    expect(onReady).toHaveBeenCalledWith(true)
  })

  it('allows only the host controls to select the room track', async () => {
    const onSelectTrack = vi.fn()
    const user = userEvent.setup()

    render(
      <MultiplayerLobby
        busy={false}
        currentUserId="host"
        error={null}
        onCreate={vi.fn()}
        onJoin={vi.fn()}
        onLeave={vi.fn()}
        onReady={vi.fn()}
        onSelectGenome={vi.fn()}
        onSelectTrack={onSelectTrack}
        onStart={vi.fn()}
        room={room}
        trainingRuns={[]}
      />,
    )

    const input = screen.getByRole('spinbutton', {
      name: 'Semilla de pista multijugador',
    })
    await user.clear(input)
    await user.type(input, '777')
    await user.click(screen.getByRole('button', { name: 'Aplicar semilla' }))

    expect(onSelectTrack).toHaveBeenCalledWith(777)
  })
})
