import { useState } from 'react'
import type { FormEvent } from 'react'
import type { TrainingRun } from '../api/training.api.ts'

interface TrainingRunSelectorProps {
  busy: boolean
  error: string | null
  onCreate: (name: string, seed: number) => Promise<void>
  onDelete: (trainingRun: TrainingRun) => Promise<void>
  onLoad: (trainingRun: TrainingRun) => Promise<void>
  runs: TrainingRun[]
}

export function TrainingRunSelector({
  busy,
  error,
  onCreate,
  onDelete,
  onLoad,
  runs,
}: TrainingRunSelectorProps) {
  const [name, setName] = useState('Entrenamiento NEAT')
  const [seed, setSeed] = useState(() =>
    Math.floor(Math.random() * 2_147_483_648),
  )

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 3) return
    await onCreate(name.trim(), seed)
  }

  return (
    <section className="run-selector" aria-label="Entrenamientos guardados">
      <div className="run-selector__panel">
        <p className="eyebrow">Race Lab // Garaje</p>
        <h1>Prepara tu escuderia.</h1>
        <p className="run-selector__lead">
          Genera un circuito reproducible, lanza una nueva temporada o recupera
          una partida guardada.
        </p>

        <form className="run-selector__create run-setup" onSubmit={(event) => void submit(event)}>
          <label>
            Nombre de la escuderia
            <input
              aria-label="Nombre del entrenamiento"
              maxLength={80}
              minLength={3}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <div className="track-preset track-preset--selected">
            <span>Circuito procedural</span>
            <strong>Curved Loop</strong>
            <small>Curvas variables · 4 sectores · reproducible por semilla</small>
          </div>
          <label>
            Semilla del circuito
            <span className="seed-control">
              <input
                aria-label="Semilla del circuito"
                min={0}
                max={2147483647}
                onChange={(event) => setSeed(Number(event.target.value))}
                type="number"
                value={seed}
              />
              <button
                type="button"
                onClick={() => setSeed(Math.floor(Math.random() * 2_147_483_648))}
              >
                Generar otra
              </button>
            </span>
          </label>
          <details className="neat-advanced">
            <summary>Telemetria avanzada</summary>
            <p>24 pilotos · 5 raycasts · red 6 → 2 · simulacion race-sim-v1</p>
          </details>
          <button className="primary-button" disabled={busy || name.trim().length < 3}>
            Crear temporada
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}

        <div className="run-list">
          {runs.length === 0 && !busy && (
            <p className="run-list__empty">Todavia no hay entrenamientos guardados.</p>
          )}
          {runs.map((run) => (
            <article className="run-item" key={run.id}>
              <button
                className="run-item__load"
                disabled={busy}
                onClick={() => void onLoad(run)}
              >
                <span>{run.name}</span>
                <small>
                  Gen. {run.currentGeneration} · Mejor {run.bestFitness.toFixed(0)} · Seed {run.config.track?.seed ?? run.seed}
                </small>
              </button>
              <button
                aria-label={`Eliminar ${run.name}`}
                className="run-item__delete"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`¿Eliminar "${run.name}" y sus checkpoints?`)) {
                    void onDelete(run)
                  }
                }}
              >
                Eliminar
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
