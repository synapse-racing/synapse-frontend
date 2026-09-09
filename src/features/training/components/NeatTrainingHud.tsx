import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { GenerationMetrics } from '../neat/population.ts'
import { GameSettings } from '../../../shared/game/GameSettings.tsx'

export type TrainingStatus = 'idle' | 'running' | 'paused' | 'evolving'
export type PersistenceStatus = 'idle' | 'saving' | 'saved' | 'error'
interface NeatTrainingHudProps {
  alive: number; currentBest: number; generation: number; metrics: GenerationMetrics
  onPauseToggle: () => void; onRegenerateTrack: () => void; onReset: () => void
  onSelectRun: () => void; onStart: () => void; persistenceStatus: PersistenceStatus
  populationSize: number; status: TrainingStatus; trainingName: string
  cameraMode?: 'overview' | 'follow'; onCameraModeChange?: (mode: 'overview' | 'follow') => void
  selectedCar?: number; onSelectedCarChange?: (index: number) => void; trackSeed?: number
}
const statusLabels: Record<TrainingStatus, string> = { idle: 'Preparado', running: 'Evaluando', paused: 'Pausado', evolving: 'Evolucionando' }
const saveLabels: Record<PersistenceStatus, string> = { idle: 'Sin evaluar', saving: 'Guardando', saved: 'Guardado', error: 'Error de guardado' }

export function NeatTrainingHud({ alive, currentBest, generation, metrics, onPauseToggle,
  onRegenerateTrack, onReset, onSelectRun, onStart, persistenceStatus, populationSize,
  status, trainingName, cameraMode = 'overview', onCameraModeChange, selectedCar = 0,
  onSelectedCarChange, trackSeed,
}: NeatTrainingHudProps) {
  const [telemetry, setTelemetry] = useState(false)
  const [controls, setControls] = useState(false)
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.repeat || document.querySelector('dialog[open]') || (event.target as HTMLElement).closest('input, select, textarea')) return
      if (event.key === 'Escape' && (status === 'running' || status === 'paused')) onPauseToggle()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onPauseToggle, status])
  return <div className="neat-hud">
    <header className="neat-hud__topbar">
      <div><Link to="/dashboard">← Paddock</Link><span className={`training-status training-status--${status}`}>{statusLabels[status]}</span></div>
      <div className="neat-hud__actions">
        {onCameraModeChange && <button onClick={() => onCameraModeChange(cameraMode === 'overview' ? 'follow' : 'overview')}>{cameraMode === 'overview' ? 'Seguir auto' : 'Vista general'}</button>}
        {onSelectedCarChange && <label className="camera-select">Piloto<select aria-label="Auto observado" value={selectedCar} onChange={event => onSelectedCarChange(Number(event.target.value))}>{Array.from({ length: populationSize }, (_, index) => <option key={index} value={index}>Auto {String(index + 1).padStart(2, '0')}</option>)}</select></label>}
        <button aria-expanded={telemetry} onClick={() => { setTelemetry(!telemetry); setControls(false) }}>Telemetría</button>
        <button aria-expanded={controls} onClick={() => { setControls(!controls); setTelemetry(false) }}>Opciones</button>
        {status === 'idle' ? <button className="primary-button" onClick={onStart}>Iniciar</button> : <button className="primary-button" onClick={onPauseToggle} disabled={status === 'evolving'}>{status === 'paused' ? 'Reanudar' : 'Pausar'}</button>}
      </div>
    </header>
    <section className="neat-hud__summary"><p className="eyebrow">{trainingName} / Desierto {trackSeed !== undefined && `#${trackSeed}`}</p><h2>Generación {generation + 1}</h2></section>
    {(controls || status === 'paused') && <section className="telemetry-panel" aria-label="Opciones del entrenamiento"><h3>{status === 'paused' ? 'En boxes / Pausa' : 'Control de escudería'}</h3><div className="training-options">
      <button onClick={onReset} disabled={persistenceStatus === 'saving' || status === 'evolving'}>Recargar</button>
      <button onClick={onRegenerateTrack} disabled={status === 'evolving' || persistenceStatus === 'saving'}>Regenerar pista</button>
      <button onClick={onSelectRun} disabled={persistenceStatus === 'saving' || status === 'evolving'}>Cambiar entrenamiento</button><GameSettings />
    </div><p className="hud-hint"><kbd>ESC</kbd> Pausar / reanudar</p></section>}
    {telemetry && status !== 'paused' && <section className="telemetry-panel" aria-label="Telemetría NEAT"><h3>Generación anterior</h3><dl><dt>Mejor puntuación</dt><dd>{metrics.bestFitness.toFixed(0)}</dd><dt>Promedio</dt><dd>{metrics.averageFitness.toFixed(0)}</dd><dt>Especies</dt><dd>{metrics.speciesCount}</dd></dl></section>}
    <section className="neat-metrics" aria-label="Metricas NEAT"><div><span>Vivos</span><strong>{alive}/{populationSize}</strong></div><div><span>Mejor actual</span><strong>{currentBest.toFixed(0)}</strong></div><div><span>Mejor anterior</span><strong>{metrics.bestFitness.toFixed(0)}</strong></div><div><span>Guardado</span><strong role="status" className={`persistence-state persistence-state--${persistenceStatus}`}>{saveLabels[persistenceStatus]}</strong></div></section>
  </div>
}
