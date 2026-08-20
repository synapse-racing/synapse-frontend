import { useState } from 'react'
import type { FormEvent } from 'react'
import type { TrainingRun } from '../api/training.api.ts'

interface TrainingRunSelectorProps {
  busy: boolean
  error: string | null
  onCreate: (name: string) => Promise<void>
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

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim().length < 3) return
    await onCreate(name.trim())
  }

  return (
    <section className="run-selector" aria-label="Entrenamientos guardados">
      <div className="run-selector__panel">
        <p className="eyebrow">Persistencia NEAT</p>
        <h1>Continua una evolucion.</h1>
        <p className="run-selector__lead">
          Crea una poblacion nueva o recupera exactamente la ultima generacion
          guardada en PostgreSQL.
        </p>

        <form className="run-selector__create" onSubmit={(event) => void submit(event)}>
          <input
            aria-label="Nombre del entrenamiento"
            maxLength={80}
            minLength={3}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <button disabled={busy || name.trim().length < 3}>Crear nuevo</button>
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
                  Gen. {run.currentGeneration} · Mejor {run.bestFitness.toFixed(0)}
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
