import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SnapshotTimeline } from '../domain/snapshotTimeline.ts'
import { SceneCanvas } from '../../../shared/three/SceneCanvas.tsx'
import { TrackEnvironment } from '../../../shared/three/TrackEnvironment.tsx'
import { RaceCamera, type CarPose } from '../../../shared/three/RaceCamera.tsx'
import { GameSettings } from '../../../shared/game/GameSettings.tsx'
import { generateTrack } from '../../training/domain/track.ts'
import type {
  RaceResult,
  RaceSnapshot,
  RoomState,
} from '../types/multiplayer.ts'
import { RemoteRaceCar } from './RemoteRaceCar.tsx'

interface MultiplayerRaceProps {
  currentUserId: string
  onLeave: () => void
  result: RaceResult | null
  room: RoomState
  snapshot: RaceSnapshot
}

export function MultiplayerRace({
  currentUserId,
  onLeave,
  result,
  room,
  snapshot,
}: MultiplayerRaceProps) {
  const [cameraMode, setCameraMode] = useState<'overview' | 'follow'>(
    'overview',
  )
  const [observedId, setObservedId] = useState(currentUserId)
  const poses = useRef(new Map<string, CarPose>())
  const [timeline] = useState(() => new SnapshotTimeline())
  useLayoutEffect(() => {
    timeline.push(snapshot, performance.now())
  }, [snapshot, timeline])
  const currentPlayer = snapshot.players.find(
    (player) => player.userId === currentUserId,
  )
  const countdown = Math.max(
    0,
    Math.ceil((snapshot.startAt - snapshot.serverTime) / 1000),
  )
  const { version, seed } = room.track
  const track = useMemo(() => generateTrack({ version, seed }), [version, seed])

  return (
    <section className="multiplayer-race">
      <SceneCanvas>
        <TrackEnvironment track={track} theme="tournament" />
        {snapshot.players.map((player) => (
          <RemoteRaceCar
            key={player.userId}
            isCurrentUser={player.userId === currentUserId}
            player={player}
            timeline={timeline}
            onPose={(id, pose) => poses.current.set(id, pose)}
          />
        ))}
        <RaceCamera
          mode={cameraMode}
          getTarget={() => poses.current.get(observedId)}
        />
      </SceneCanvas>

      <div className="race-hud">
        <header>
          <button onClick={onLeave}>Abandonar</button>
          <span>Sala {room.code}</span>
          <strong>
            {snapshot.status === 'RACING'
              ? 'EN CARRERA'
              : snapshot.status === 'COUNTDOWN'
                ? 'EN PARRILLA'
                : 'FINALIZADA'}
          </strong>
        </header>
        <div className="race-standings" aria-label="Clasificación en vivo">
          {snapshot.players.map((player) => (
            <p
              key={player.userId}
              className={player.userId === currentUserId ? 'is-current' : ''}
            >
              <span>
                {player.rank}. {player.username}
              </span>
              <span>
                {player.disconnected
                  ? 'DESC.'
                  : player.eliminated
                    ? 'FUERA'
                    : player.finishedAt
                      ? 'META'
                      : `${player.passedCheckpoints}/${track.checkpoints.length}`}
              </span>
            </p>
          ))}
        </div>
        <div className="race-camera">
          <button
            onClick={() =>
              setCameraMode(cameraMode === 'overview' ? 'follow' : 'overview')
            }
          >
            {cameraMode === 'overview' ? 'Seguir piloto' : 'Vista general'}
          </button>
          <label className="camera-select">
            Observar
            <select
              value={observedId}
              onChange={(event) => {
                setObservedId(event.target.value)
                setCameraMode('follow')
              }}
            >
              {snapshot.players.map((player) => (
                <option key={player.userId} value={player.userId}>
                  {player.username}
                </option>
              ))}
            </select>
          </label>
          <GameSettings />
        </div>
        <div className="race-position">
          <span>Posicion</span>
          <strong>{currentPlayer?.rank ?? '-'}</strong>
          <small>de {snapshot.players.length}</small>
        </div>
        <div className="race-progress">
          <span>Vuelta {Math.min(1, (currentPlayer?.laps ?? 0) + 1)}/1</span>
          <span>
            Sectores {currentPlayer?.passedCheckpoints ?? 0}/
            {track.checkpoints.length}
          </span>
          <span>
            {Math.abs((currentPlayer?.speed ?? 0) * 3.6).toFixed(0)} km/h
          </span>
        </div>
        {snapshot.status === 'COUNTDOWN' && (
          <div className="race-countdown">{countdown || 'GO'}</div>
        )}
      </div>

      {result && (
        <div className="race-results">
          <div>
            <p className="eyebrow">Clasificacion oficial</p>
            <h2>Carrera finalizada</h2>
            <ol>
              {result.players.map((player) => (
                <li key={player.userId}>
                  <span>#{player.rank}</span>
                  <strong>{player.username}</strong>
                  <small>
                    {player.disconnected
                      ? 'Desconectado'
                      : player.eliminated
                        ? player.eliminationReason === 'STALLED'
                          ? 'Eliminado por inactividad'
                          : 'Eliminado por colision'
                        : player.finishedAt
                          ? 'Finalizo'
                          : `${player.passedCheckpoints}/4 checkpoints`}
                  </small>
                </li>
              ))}
            </ol>
            <button className="primary-button" onClick={onLeave}>
              Volver a salas
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
