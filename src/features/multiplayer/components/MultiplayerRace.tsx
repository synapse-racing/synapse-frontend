import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { SnapshotTimeline } from '../domain/snapshotTimeline.ts'
import { SceneCanvas } from '../../../shared/three/SceneCanvas.tsx'
import { TrackEnvironment } from '../../../shared/three/TrackEnvironment.tsx'
import {
  RaceCamera,
  type CarPose,
  type RaceCameraMode,
} from '../../../shared/three/RaceCamera.tsx'
import {
  SimulationSpeedControl,
  type SimulationSpeed,
} from '../../../shared/game/SimulationSpeedControl.tsx'
import { GameSettings } from '../../../shared/game/GameSettings.tsx'
import { CarActions } from '../../../shared/game/CarActions.tsx'
import { generateTrack } from '../../training/domain/track.ts'
import type {
  RaceResult,
  RaceSnapshot,
  RoomState,
} from '../types/multiplayer.ts'
import { RemoteRaceCar } from './RemoteRaceCar.tsx'

interface MultiplayerRaceProps {
  onTimeScaleChange: (speed: SimulationSpeed) => void
  onEliminateCar: (userId: string, startAt: number) => void
  controlsDisabled: boolean
  error: string | null
  currentUserId: string
  onLeave: () => void
  onReturnToRoom: () => void
  result: RaceResult | null
  room: RoomState
  snapshot: RaceSnapshot
}

export function MultiplayerRace({
  onTimeScaleChange,
  onEliminateCar,
  controlsDisabled,
  error,
  currentUserId,
  onLeave,
  onReturnToRoom,
  result,
  room,
  snapshot,
}: MultiplayerRaceProps) {
  const [cameraMode, setCameraMode] = useState<RaceCameraMode>('overview')
  const [observedId, setObservedId] = useState(currentUserId)
  const [inspectedCar, setInspectedCar] = useState<{
    id: string
    startAt: number
  } | null>(null)
  const poses = useRef(new Map<string, CarPose>())
  const [timeline] = useState(() => new SnapshotTimeline())
  const previousSnapshot = useRef(snapshot)
  useLayoutEffect(() => {
    timeline.push(snapshot, performance.now())
  }, [snapshot, timeline])
  useLayoutEffect(() => {
    const previous = previousSnapshot.current
    previousSnapshot.current = snapshot
    if (
      cameraMode === 'follow' &&
      previous.startAt === snapshot.startAt &&
      snapshot.players.find((p) => p.userId === observedId)
        ?.eliminationReason === 'HOST' &&
      previous.players.find((p) => p.userId === observedId)
        ?.eliminationReason !== 'HOST'
    )
      setCameraMode('free')
  }, [snapshot, cameraMode, observedId])
  const currentPlayer = snapshot.players.find(
    (player) => player.userId === currentUserId,
  )
  const inspected =
    inspectedCar?.startAt === snapshot.startAt
      ? snapshot.players.find((p) => p.userId === inspectedCar.id)
      : undefined
  const host = room.hostUserId === currentUserId
  function selectCar(id: string) {
    setObservedId(id)
    setCameraMode('follow')
    setInspectedCar({ id, startAt: snapshot.startAt })
  }
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
            selected={observedId === player.userId}
            onSelect={selectCar}
            onPose={(id, pose) => poses.current.set(id, pose)}
          />
        ))}
        <RaceCamera
          extent={Math.max(...track.groundSize)}
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
              <button
                className="race-standings__select"
                aria-label={`Seguir a ${player.username}`}
                onClick={() => selectCar(player.userId)}
              >
                {player.rank}. {player.username}
              </button>
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
          <SimulationSpeedControl
            speed={room.timeScale ?? 1}
            onChange={
              room.hostUserId === currentUserId ? onTimeScaleChange : undefined
            }
            disabled={controlsDisabled || snapshot.status === 'FINISHED'}
          />
          {error && <span role="alert">{error}</span>}
          <button
            onClick={() =>
              setCameraMode(cameraMode === 'follow' ? 'overview' : 'follow')
            }
          >
            {cameraMode === 'follow' ? 'Vista general' : 'Seguir piloto'}
          </button>
          <label className="camera-select">
            Observar
            <select
              value={observedId}
              onChange={(event) => {
                selectCar(event.target.value)
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

      {inspected && !result && (
        <CarActions
          name={inspected.username}
          status={
            inspected.disconnected
              ? 'Desconectado'
              : inspected.eliminated
                ? inspected.eliminationReason === 'HOST'
                  ? 'Eliminado por el anfitrión'
                  : 'Eliminado'
                : inspected.finishedAt !== null
                  ? 'Meta'
                  : snapshot.status === 'COUNTDOWN'
                    ? 'En parrilla'
                    : 'En pista'
          }
          onFollow={() => {
            setObservedId(inspected.userId)
            setCameraMode('follow')
          }}
          onEliminate={
            host
              ? () => onEliminateCar(inspected.userId, snapshot.startAt)
              : undefined
          }
          canEliminate={
            !controlsDisabled &&
            snapshot.status === 'RACING' &&
            !inspected.eliminated &&
            !inspected.disconnected &&
            inspected.finishedAt === null
          }
          onClose={() => setInspectedCar(null)}
        />
      )}

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
                        ? player.eliminationReason === 'HOST'
                          ? 'Eliminado por el anfitrión'
                          : player.eliminationReason === 'STALLED'
                            ? 'Eliminado por inactividad'
                            : 'Eliminado por colision'
                        : player.finishedAt
                          ? 'Finalizo'
                          : `${player.passedCheckpoints}/${track.checkpoints.length} checkpoints`}
                  </small>
                </li>
              ))}
            </ol>
            <button className="primary-button" onClick={onReturnToRoom}>
              Volver a la sala
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
