import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/context/useAuth.ts'
import {
  connectMultiplayer,
  type MultiplayerSocket,
} from '../api/multiplayer.socket.ts'
import { MultiplayerLobby } from '../components/MultiplayerLobby.tsx'
import { MultiplayerRace } from '../components/MultiplayerRace.tsx'
import type {
  RaceResult,
  RaceSnapshot,
  RoomState,
} from '../types/multiplayer.ts'
import {
  listTrainingRuns,
  type TrainingRun,
} from '../../training/api/training.api.ts'

type ConnectionState = 'connecting' | 'connected' | 'disconnected'

export function MultiplayerPage() {
  const auth = useAuth()
  const socketRef = useRef<MultiplayerSocket | null>(null)
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [room, setRoom] = useState<RoomState | null>(null)
  const [snapshot, setSnapshot] = useState<RaceSnapshot | null>(null)
  const [result, setResult] = useState<RaceResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trainingRuns, setTrainingRuns] = useState<TrainingRun[]>([])

  useEffect(() => {
    if (!auth.accessToken) return
    const socket = connectMultiplayer(auth.accessToken)
    socketRef.current = socket

    socket.on('connection:ready', () => {
      setConnection('connected')
      setError(null)
    })
    socket.on('connect_error', () => {
      setConnection('disconnected')
      setError('No se pudo conectar con el servidor multijugador')
    })
    socket.on('disconnect', () => setConnection('disconnected'))
    socket.on('server:error', (serverError) => setError(serverError.message))
    socket.on('room:state', (state) => {
      setRoom(state)
      setError(null)
    })
    socket.on('room:left', () => {
      setRoom(null)
      setSnapshot(null)
      setResult(null)
    })
    socket.on('race:start', () => setResult(null))
    socket.on('race:snapshot', setSnapshot)
    socket.on('race:finish', setResult)

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [auth.accessToken])

  useEffect(() => {
    if (!auth.accessToken) return
    void listTrainingRuns(auth.accessToken)
      .then(setTrainingRuns)
      .catch(() => setError('No se pudieron cargar tus pilotos NEAT'))
  }, [auth.accessToken])

  function leaveRoom() {
    socketRef.current?.emit('room:leave')
    setRoom(null)
    setSnapshot(null)
    setResult(null)
  }

  const currentUserId = auth.user?.id ?? ''
  const racing = room && room.status !== 'LOBBY'

  return (
    <main className="multiplayer-page">
      {!racing && (
        <header className="multiplayer-nav">
          <Link to="/dashboard">← Dashboard</Link>
          <span className={`network-state network-state--${connection}`}>
            {connection}
          </span>
        </header>
      )}

      {racing && snapshot ? (
        <MultiplayerRace
          currentUserId={currentUserId}
          onLeave={leaveRoom}
          result={result}
          room={room}
          snapshot={snapshot}
        />
      ) : racing ? (
        <section className="multiplayer-loading">
          <p className="eyebrow">Sincronizando carrera</p>
          <h1>Cuenta regresiva</h1>
        </section>
      ) : (
        <MultiplayerLobby
          busy={connection !== 'connected'}
          currentUserId={currentUserId}
          error={error}
          onCreate={(maxPlayers) =>
            socketRef.current?.emit('room:create', { maxPlayers })
          }
          onJoin={(code) => socketRef.current?.emit('room:join', { code })}
          onLeave={leaveRoom}
          onReady={(ready) =>
            socketRef.current?.emit('player:ready', { ready })
          }
          onSelectGenome={(trainingRunId) =>
            socketRef.current?.emit('player:select-genome', { trainingRunId })
          }
          onStart={() => socketRef.current?.emit('race:start')}
          room={room}
          trainingRuns={trainingRuns}
        />
      )}
    </main>
  )
}
