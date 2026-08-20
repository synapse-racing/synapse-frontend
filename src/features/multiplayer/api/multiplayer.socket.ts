import { io, type Socket } from 'socket.io-client'
import { environment } from '../../../shared/config/environment.ts'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types/multiplayer.ts'

export type MultiplayerSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export function connectMultiplayer(accessToken: string): MultiplayerSocket {
  const backendOrigin = environment.apiUrl.startsWith('/')
    ? window.location.origin
    : new URL(environment.apiUrl).origin
  return io(`${backendOrigin}/multiplayer`, {
    auth: { token: accessToken },
    transports: ['websocket'],
  })
}
