import { apiRequest } from '../../../shared/api/http.ts'
import type { TrainingRun } from '../api/training.api.ts'
import { deleteGuestRun, listGuestTrainings } from './guest-training.ts'
import type { GuestTraining } from './guest-training.ts'

export const guestImportIntentKey = 'synapse-import-guest-training'
export function requestGuestImport() {
  try {
    sessionStorage.setItem(guestImportIntentKey, 'true')
  } catch {
    /* Manual import remains available. */
  }
}

export async function importGuestTrainings(
  token: string,
  onProgress: (completed: number, total: number) => void,
  signal?: AbortSignal,
) {
  const work = async () => {
    const records = await listGuestTrainings()
    onProgress(0, records.length)
    for (const [index, record] of records.entries()) {
      signal?.throwIfAborted()
      await importGuestTraining(token, record, signal)
      signal?.throwIfAborted()
      await deleteGuestRun(record.id)
      onProgress(index + 1, records.length)
    }
    return records.length
  }
  // Serialize imports from two tabs; server-side source IDs also make retries safe.
  if (navigator.locks)
    return navigator.locks.request('synapse-guest-import', { signal }, work)
  return work()
}

export function importGuestTraining(
  token: string,
  record: GuestTraining,
  signal?: AbortSignal,
) {
  return apiRequest<TrainingRun>('/training-runs/import-guest', {
    token,
    method: 'POST',
    signal,
    body: JSON.stringify({
      sourceId: record.id,
      name: record.run.name,
      seed: record.run.seed,
      config: record.checkpoint.snapshot.config,
      generation: record.checkpoint.generation,
      snapshot: record.checkpoint.snapshot,
      bestGenome: record.bestGenome ?? undefined,
      bestFitness: record.run.bestFitness,
      metrics: record.metrics.map(
        ({
          generation,
          bestFitness,
          averageFitness,
          speciesCount,
          durationMs,
        }) => ({
          generation,
          bestFitness,
          averageFitness,
          speciesCount,
          durationMs,
        }),
      ),
    }),
  })
}
