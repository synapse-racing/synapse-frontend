import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { RoomState } from '../types/multiplayer.ts'
import type { TrainingRun } from '../../training/api/training.api.ts'

interface MultiplayerLobbyProps {
  busy: boolean
  currentUserId: string
  error: string | null
  onCreate: (maxPlayers: number) => void
  onJoin: (code: string) => void
  onLeave: () => void
  onReady: (ready: boolean) => void
  onSelectGenome: (trainingRunId: string) => void
  onSelectTrack: (seed: number) => void
  onStart: () => void
  room: RoomState | null
  trainingRuns: TrainingRun[]
}

export function MultiplayerLobby({
  busy,
  currentUserId,
  error,
  onCreate,
  onJoin,
  onLeave,
  onReady,
  onSelectGenome,
  onSelectTrack,
  onStart,
  room,
  trainingRuns,
}: MultiplayerLobbyProps) {
  const [code, setCode] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [trackSeed, setTrackSeed] = useState(0)
  const roomTrackSeed = room?.track.seed

  useEffect(() => {
    if (roomTrackSeed !== undefined) setTrackSeed(roomTrackSeed)
  }, [roomTrackSeed])

  function join(event: FormEvent) {
    event.preventDefault()
    if (code.trim().length === 6) onJoin(code.trim().toUpperCase())
  }

  if (!room) {
    return (
      <section className="multiplayer-home">
        <div className="multiplayer-home__intro">
          <p className="eyebrow">Carreras autoritativas</p>
          <h1>Comparte pista. No estado.</h1>
          <p>
            El servidor calcula posiciones, checkpoints y resultados. Invita a
            otro piloto con un codigo privado de seis caracteres.
          </p>
        </div>
        <div className="multiplayer-actions">
          <div>
            <h2>Crear sala</h2>
            <label>
              Capacidad
              <select
                value={maxPlayers}
                onChange={(event) => setMaxPlayers(Number(event.target.value))}
              >
                <option value={2}>2 pilotos</option>
                <option value={3}>3 pilotos</option>
                <option value={4}>4 pilotos</option>
              </select>
            </label>
            <button disabled={busy} onClick={() => onCreate(maxPlayers)}>
              Crear codigo
            </button>
          </div>
          <form onSubmit={join}>
            <h2>Unirse</h2>
            <label>
              Codigo de sala
              <input
                aria-label="Codigo de sala"
                maxLength={6}
                onChange={(event) =>
                  setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                }
                placeholder="ABC123"
                value={code}
              />
            </label>
            <button disabled={busy || code.length !== 6}>Entrar</button>
          </form>
        </div>
        {error && <p className="multiplayer-error">{error}</p>}
      </section>
    )
  }

  const currentPlayer = room.players.find((player) => player.userId === currentUserId)
  const isHost = room.hostUserId === currentUserId
  const compatibleRuns = trainingRuns.filter(
    (run) =>
      run.currentGeneration > 0 && run.config.simulationVersion === 'race-sim-v1',
  )
  const canStart =
    isHost && room.players.length >= 2 && room.players.every((player) => player.ready)

  return (
    <section className="multiplayer-lobby">
      <div className="lobby-code">
        <span>Codigo privado</span>
        <strong>{room.code}</strong>
        <small>
          {room.players.length}/{room.maxPlayers} pilotos
        </small>
      </div>

      <section className="lobby-track" aria-label="Pista multijugador">
        <div>
          <span>Pista de la sala</span>
          <strong>Curved Loop #{room.track.seed}</strong>
          <small>La pista es independiente de los pilotos NEAT seleccionados.</small>
        </div>
        {isHost ? (
          <div className="lobby-track__controls">
            <input
              aria-label="Semilla de pista multijugador"
              min={0}
              max={2_147_483_647}
              onChange={(event) => setTrackSeed(Number(event.target.value))}
              type="number"
              value={trackSeed}
            />
            <button
              disabled={busy || !Number.isSafeInteger(trackSeed)}
              onClick={() => onSelectTrack(trackSeed)}
            >
              Aplicar semilla
            </button>
            <button
              disabled={busy}
              onClick={() => {
                const seed = Math.floor(Math.random() * 2_147_483_648)
                setTrackSeed(seed)
                onSelectTrack(seed)
              }}
            >
              Generar otra
            </button>
          </div>
        ) : (
          <small>Solo el host puede cambiar la pista.</small>
        )}
      </section>

      <div className="lobby-players">
        {room.players.map((player, index) => (
          <article key={player.userId}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <strong>{player.username}</strong>
              <small>{player.userId === room.hostUserId ? 'Host' : 'Piloto'}</small>
              <small>{player.genomeName ?? 'Sin piloto NEAT'}</small>
            </div>
            <i className={player.ready ? 'is-ready' : ''}>
              {player.ready ? 'Listo' : 'Esperando'}
            </i>
          </article>
        ))}
      </div>

      {error && <p className="multiplayer-error">{error}</p>}
      <label>
        Piloto NEAT
        <select
          disabled={currentPlayer?.ready}
          onChange={(event) => onSelectGenome(event.target.value)}
          value={
            trainingRuns.find((run) => run.name === currentPlayer?.genomeName)?.id ?? ''
          }
        >
          <option value="">Selecciona un entrenamiento</option>
          {compatibleRuns.map((run) => (
              <option key={run.id} value={run.id}>
                {run.name} · gen. {run.currentGeneration}
              </option>
            ))}
        </select>
      </label>
      {compatibleRuns.length === 0 && (
        <p className="multiplayer-error">
          Entrena al menos una generacion nueva con race-sim-v1 para competir.
        </p>
      )}
      <div className="lobby-actions">
        <button onClick={onLeave}>Salir</button>
        <button
          className="primary-button"
          disabled={!currentPlayer?.genomeName}
          onClick={() => onReady(!currentPlayer?.ready)}
        >
          {currentPlayer?.ready ? 'Cancelar listo' : 'Estoy listo'}
        </button>
        {isHost && (
          <button disabled={!canStart} onClick={onStart}>
            Iniciar carrera
          </button>
        )}
      </div>
    </section>
  )
}
