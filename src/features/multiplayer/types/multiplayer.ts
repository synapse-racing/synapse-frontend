export type RoomStatus = 'LOBBY' | 'COUNTDOWN' | 'RACING' | 'FINISHED'

export interface RoomPlayer {
  userId: string
  username: string
  ready: boolean
  genomeName: string | null
}

export interface RoomState {
  code: string
  hostUserId: string
  status: RoomStatus
  maxPlayers: number
  players: RoomPlayer[]
}

export interface RaceInput {
  sequence: number
  steering: number
  throttle: number
}

export interface RacePlayerState {
  userId: string
  username: string
  x: number
  z: number
  yaw: number
  speed: number
  expectedCheckpoint: number
  passedCheckpoints: number
  laps: number
  finishedAt: number | null
  disconnected: boolean
  eliminated: boolean
  rank: number
}

export interface RaceSnapshot {
  serverTime: number
  startAt: number
  status: RoomStatus
  players: RacePlayerState[]
}

export interface RaceResult {
  finishedAt: number
  players: RacePlayerState[]
}

export interface ServerError {
  code: string
  message: string
}

export interface ServerToClientEvents {
  'connection:ready': (payload: { userId: string }) => void
  'server:error': (payload: ServerError) => void
  'room:state': (state: RoomState) => void
  'room:left': () => void
  'race:start': (payload: { startAt: number }) => void
  'race:snapshot': (snapshot: RaceSnapshot) => void
  'race:finish': (result: RaceResult) => void
}

export interface ClientToServerEvents {
  'room:create': (input: { maxPlayers: number }) => void
  'room:join': (input: { code: string }) => void
  'room:leave': () => void
  'player:ready': (input: { ready: boolean }) => void
  'player:select-genome': (input: { trainingRunId: string }) => void
  'race:start': () => void
}
