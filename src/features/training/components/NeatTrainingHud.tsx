import { Link } from 'react-router-dom'
import type { GenerationMetrics } from '../neat/population.ts'

export type TrainingStatus = 'idle' | 'running' | 'paused' | 'evolving'
export type PersistenceStatus = 'idle' | 'saving' | 'saved' | 'error'

interface NeatTrainingHudProps {
  alive: number
  currentBest: number
  generation: number
  metrics: GenerationMetrics
  onPauseToggle: () => void
  onReset: () => void
  onSelectRun: () => void
  onStart: () => void
  persistenceStatus: PersistenceStatus
  populationSize: number
  seed: number
  status: TrainingStatus
  trainingName: string
}

const statusLabels: Record<TrainingStatus, string> = {
  idle: 'Preparado',
  running: 'Evaluando',
  paused: 'Pausado',
  evolving: 'Evolucionando',
}

export function NeatTrainingHud({
  alive,
  currentBest,
  generation,
  metrics,
  onPauseToggle,
  onReset,
  onSelectRun,
  onStart,
  persistenceStatus,
  populationSize,
  seed,
  status,
  trainingName,
}: NeatTrainingHudProps) {
  return (
    <div className="neat-hud">
      <header className="neat-hud__topbar">
        <div>
          <Link to="/dashboard">← Dashboard</Link>
          <Link to="/training">Modo manual</Link>
          <button className="neat-hud__change" onClick={onSelectRun}>
            Cambiar
          </button>
        </div>
        <span className={`training-status training-status--${status}`}>
          {statusLabels[status]}
        </span>
        <div className="neat-hud__actions">
          {status === 'idle' ? (
            <button className="primary-button" onClick={onStart}>
              Iniciar
            </button>
          ) : (
            <button onClick={onPauseToggle} disabled={status === 'evolving'}>
              {status === 'paused' ? 'Reanudar' : 'Pausar'}
            </button>
          )}
          <button onClick={onReset}>Recargar</button>
        </div>
      </header>

      <section className="neat-hud__summary">
        <p className="eyebrow">
          NEAT // {trainingName} // seed {seed}
        </p>
        <h1>Generacion {generation + 1}</h1>
        <p>
          Cinco raycasts y velocidad alimentan cada red. El auto resaltado es
          el campeon heredado de la generacion anterior.
        </p>
      </section>

      <section className="neat-metrics" aria-label="Metricas NEAT">
        <div>
          <span>Vivos</span>
          <strong>
            {alive}/{populationSize}
          </strong>
        </div>
        <div>
          <span>Mejor actual</span>
          <strong>{currentBest.toFixed(0)}</strong>
        </div>
        <div>
          <span>Mejor anterior</span>
          <strong>{metrics.bestFitness.toFixed(0)}</strong>
        </div>
        <div>
          <span>Promedio anterior</span>
          <strong>{metrics.averageFitness.toFixed(0)}</strong>
        </div>
        <div>
          <span>Guardado</span>
          <strong className={`persistence-state persistence-state--${persistenceStatus}`}>
            {persistenceStatus === 'saving'
              ? 'Guardando'
              : persistenceStatus === 'error'
                ? 'Error'
                : persistenceStatus === 'saved'
                  ? 'Listo'
                  : `${metrics.speciesCount} esp.`}
          </strong>
        </div>
      </section>
    </div>
  )
}
