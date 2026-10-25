import type {
  GenerationMetric,
  SaveCheckpointInput,
  TrainingCheckpoint,
  TrainingRun,
} from '../api/training.api.ts'
import type { NeatConfig } from '../neat/config.ts'
import { NeatPopulation } from '../neat/population.ts'
import type { TrackRecipe } from '../domain/track.ts'
import type { Genome } from '../neat/genes.ts'

export interface GuestTraining {
  id: string
  run: TrainingRun
  checkpoint: TrainingCheckpoint
  bestGenome: Genome | null
  metrics: GenerationMetric[]
}

const databaseName = 'synapse-guest-training'
const storeName = 'runs'

async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, result: (value: T) => void) => void,
): Promise<T> {
  if (typeof indexedDB === 'undefined')
    throw new Error(
      'El almacenamiento local no está disponible en este navegador.',
    )
  return new Promise<T>((resolve, reject) => {
    const open = indexedDB.open(databaseName, 1)
    open.onupgradeneeded = () =>
      open.result.createObjectStore(storeName, { keyPath: 'id' })
    open.onerror = () =>
      reject(
        new Error(
          'No se pudo abrir el guardado local. Revisa el almacenamiento del navegador.',
        ),
      )
    open.onblocked = () =>
      reject(
        new Error(
          'Cierra otras pestañas de Synapse para abrir el guardado local.',
        ),
      )
    open.onsuccess = () => {
      const db = open.result
      const tx = db.transaction(storeName, mode)
      let value: T
      let failure: unknown
      tx.oncomplete = () => {
        db.close()
        resolve(value)
      }
      tx.onabort = tx.onerror = () => {
        db.close()
        reject(
          failure ??
            new Error(
              'No se pudo guardar en este dispositivo. Revisa el espacio disponible.',
            ),
        )
      }
      try {
        action(tx.objectStore(storeName), (result) => {
          value = result
        })
      } catch (error) {
        failure = error
        tx.abort()
      }
    }
  })
}

export function listGuestTrainings(): Promise<GuestTraining[]> {
  return transaction<GuestTraining[]>('readonly', (store, done) => {
    const req = store.getAll()
    req.onsuccess = () =>
      done(
        (req.result as GuestTraining[]).sort((a, b) =>
          b.run.updatedAt.localeCompare(a.run.updatedAt),
        ),
      )
  })
}

export async function listGuestRuns() {
  return (await listGuestTrainings()).map((record) => record.run)
}

export function getGuestTraining(id: string): Promise<GuestTraining> {
  return transaction<GuestTraining | undefined>('readonly', (store, done) => {
    const req = store.get(id)
    req.onsuccess = () => {
      // An absent run is handled by the caller instead of creating an empty snapshot.
      done(req.result as GuestTraining)
    }
  }).then((record) => {
    if (!record) throw new Error('No se encontró el entrenamiento local.')
    return record
  })
}

export async function createGuestRun(input: {
  name: string
  seed: number
  config: NeatConfig
}) {
  const id = crypto.randomUUID(),
    now = new Date().toISOString()
  const engine = new NeatPopulation(input.seed, input.config)
  const run: TrainingRun = {
    id,
    name: input.name,
    seed: input.seed,
    config: engine.config,
    status: 'PAUSED',
    currentGeneration: 0,
    bestFitness: 0,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  }
  await transaction<void>('readwrite', (store, done) => {
    store.add({
      id,
      run,
      checkpoint: {
        id,
        trainingRunId: id,
        generation: 0,
        snapshot: engine.toSnapshot(),
        createdAt: now,
      },
      bestGenome: null,
      metrics: [],
    } satisfies GuestTraining)
    done()
  })
  return run
}

function updateGuestRun(
  id: string,
  change: (record: GuestTraining) => void,
): Promise<TrainingRun> {
  return transaction('readwrite', (store, done) => {
    const request = store.get(id)
    request.onsuccess = () => {
      try {
        const record = request.result as GuestTraining | undefined
        if (!record) {
          store.transaction.abort()
          return
        }
        change(record)
        record.run.updatedAt = new Date().toISOString()
        store.put(record)
        done(record.run)
      } catch {
        store.transaction.abort()
      }
    }
  })
}

export function saveGuestCheckpoint(id: string, input: SaveCheckpointInput) {
  return updateGuestRun(id, (record) => {
    const now = new Date().toISOString()
    record.run.currentGeneration = input.generation
    if (input.bestFitness >= record.run.bestFitness)
      record.bestGenome = input.bestGenome
    record.run.bestFitness = Math.max(record.run.bestFitness, input.bestFitness)
    record.checkpoint = {
      id,
      trainingRunId: id,
      generation: input.generation,
      snapshot: input.snapshot,
      createdAt: now,
    }
    const metric: GenerationMetric = {
      id: `${id}:${input.generation}`,
      trainingRunId: id,
      generation: input.generation,
      bestFitness: input.bestFitness,
      averageFitness: input.averageFitness,
      speciesCount: input.speciesCount,
      durationMs: input.durationMs,
      createdAt: now,
    }
    record.metrics = [
      ...record.metrics.filter((m) => m.generation !== input.generation),
      metric,
    ].sort((a, b) => a.generation - b.generation)
  })
}

export function updateGuestStatus(id: string, status: TrainingRun['status']) {
  return updateGuestRun(id, (record) => {
    record.run.status = status
  })
}

export function updateGuestTrack(id: string, track: TrackRecipe) {
  return updateGuestRun(id, (record) => {
    const snapshot = record.checkpoint.snapshot
    record.run.config = { ...record.run.config, track }
    record.run.status = 'PAUSED'
    record.run.bestFitness = 0
    record.bestGenome = null
    record.metrics = []
    record.checkpoint.snapshot = {
      ...snapshot,
      config: { ...snapshot.config, track },
    }
  })
}

export function deleteGuestRun(id: string): Promise<void> {
  return transaction('readwrite', (store, done) => {
    store.delete(id)
    done()
  })
}
