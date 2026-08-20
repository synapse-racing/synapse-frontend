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
  players: [
    { userId: 'host', username: 'Host', ready: true },
    { userId: 'guest', username: 'Guest', ready: false },
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
        onStart={vi.fn()}
        room={room}
      />,
    )

    expect(screen.getByText('ABC123')).toBeInTheDocument()
    expect(screen.getByText('Guest')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Estoy listo' }))
    expect(onReady).toHaveBeenCalledWith(true)
  })
})
