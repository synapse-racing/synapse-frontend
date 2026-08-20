import { Link } from 'react-router-dom'
import { sensorAngles } from '../domain/sensors.ts'
import type { TrackProgress } from '../domain/progress.ts'
import type { VehicleTelemetry } from '../types/telemetry.ts'

interface TrainingHudProps {
  checkpointCount: number
  onReset: () => void
  progress: TrackProgress
  telemetry: VehicleTelemetry
}

export function TrainingHud({
  checkpointCount,
  onReset,
  progress,
  telemetry,
}: TrainingHudProps) {
  return (
    <div className="training-hud">
      <header className="training-hud__topbar">
        <Link to="/dashboard">← Dashboard</Link>
        <Link className="training-hud__mode-link" to="/training/neat">
          Entrenamiento NEAT
        </Link>
        <button onClick={onReset}>Reiniciar</button>
      </header>

      <section className="training-hud__metrics" aria-label="Telemetria">
        <div>
          <span>Velocidad</span>
          <strong>{(telemetry.speed * 3.6).toFixed(0)} km/h</strong>
        </div>
        <div>
          <span>Siguiente checkpoint</span>
          <strong>
            {progress.expectedCheckpoint + 1}/{checkpointCount}
          </strong>
        </div>
        <div>
          <span>Vueltas</span>
          <strong>{progress.laps}</strong>
        </div>
      </section>

      <section className="sensor-panel" aria-label="Sensores raycast">
        <div className="sensor-panel__heading">
          <span>Raycasts</span>
          <small>distancia normalizada</small>
        </div>
        {sensorAngles.map((angle, index) => (
          <div className="sensor-reading" key={angle}>
            <span>{angle > 0 ? `+${angle}°` : `${angle}°`}</span>
            <div>
              <i style={{ width: `${telemetry.sensors[index] * 100}%` }} />
            </div>
            <strong>{telemetry.sensors[index].toFixed(2)}</strong>
          </div>
        ))}
      </section>

      <aside className="controls-hint">
        <span>WASD / Flechas</span>
        <span>R para reiniciar</span>
      </aside>
      <aside className="touch-warning">
        Este prototipo requiere un teclado para conducir.
      </aside>
    </div>
  )
}
