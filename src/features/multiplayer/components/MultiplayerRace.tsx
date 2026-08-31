import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { generateTrack } from '../../training/domain/track.ts'
import { TrackVisual } from '../../training/components/TrackVisual.tsx'
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
  const currentPlayer = snapshot.players.find(
    (player) => player.userId === currentUserId,
  )
  const countdown = Math.max(0, Math.ceil((snapshot.startAt - Date.now()) / 1000))
  const track = generateTrack(room.track)

  return (
    <section className="multiplayer-race">
        <Canvas
          shadows
          camera={{ position: [0, 40, 35], fov: 50, near: 0.1, far: 140 }}
          dpr={[1, 1.35]}
        >
          <color attach="background" args={['#071018']} />
          <ambientLight intensity={0.8} />
          <hemisphereLight args={['#c5e6f2', '#101820', 0.8]} />
          <directionalLight position={[12, 24, 8]} intensity={2} castShadow />
          <TrackVisual definition={track} />
          {snapshot.players.map((player) => (
            <RemoteRaceCar
              key={player.userId}
              isCurrentUser={player.userId === currentUserId}
              player={player}
            />
          ))}
          <OrbitControls
            makeDefault
            target={[0, 0, 0]}
            minDistance={24}
            maxDistance={65}
            maxPolarAngle={Math.PI / 2.15}
          />
        </Canvas>

        <div className="race-hud">
          <header>
            <button onClick={onLeave}>Abandonar</button>
            <span>Sala {room.code}</span>
            <strong>{snapshot.status === 'RACING' ? 'EN CARRERA' : snapshot.status}</strong>
          </header>
          <div className="race-position">
            <span>Posicion</span>
            <strong>{currentPlayer?.rank ?? '-'}</strong>
            <small>de {snapshot.players.length}</small>
          </div>
          <div className="race-progress">
            <span>Vuelta {Math.min(1, (currentPlayer?.laps ?? 0) + 1)}/1</span>
            <span>Checkpoint {(currentPlayer?.expectedCheckpoint ?? 0) + 1}/4</span>
            <span>{Math.abs((currentPlayer?.speed ?? 0) * 3.6).toFixed(0)} km/h</span>
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
