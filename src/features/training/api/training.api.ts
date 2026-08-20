import { apiRequest } from '../../../shared/api/http.ts'
import type { NeatConfig } from '../neat/config.ts'
import type { Genome } from '../neat/genes.ts'
import type {
  GenerationMetrics,
  NeatPopulationSnapshot,
} from '../neat/population.ts'

export type RemoteTrainingStatus = 'PAUSED' | 'RUNNING' | 'COMPLETED'

export interface TrainingRun {
  id: string
  name: string
  status: RemoteTrainingStatus
  seed: number
  currentGeneration: number
  bestFitness: number
  config: NeatConfig
  createdAt: string
  updatedAt: string
  startedAt: string | null
  finishedAt: string | null
}

export interface TrainingCheckpoint {
  id: string
  trainingRunId: string
  generation: number
  snapshot: NeatPopulationSnapshot
  createdAt: string
}

export interface SaveCheckpointInput {
  generation: number
  snapshot: NeatPopulationSnapshot
  bestGenome: Genome
  bestFitness: number
  averageFitness: number
  speciesCount: number
  durationMs: number
}

export interface GenerationMetric extends GenerationMetrics {
  id: string
  trainingRunId: string
  durationMs: number
  createdAt: string
}

export function listTrainingRuns(token: string) {
  return apiRequest<TrainingRun[]>('/training-runs', { token })
}

export function createTrainingRun(
  token: string,
  input: { name: string; seed: number; config: NeatConfig },
) {
  return apiRequest<TrainingRun>('/training-runs', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  })
}

export function updateTrainingStatus(
  token: string,
  id: string,
  status: RemoteTrainingStatus,
) {
  return apiRequest<TrainingRun>(`/training-runs/${id}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  })
}

export function deleteTrainingRun(token: string, id: string) {
  return apiRequest<void>(`/training-runs/${id}`, {
    method: 'DELETE',
    token,
  })
}

export function getLatestCheckpoint(token: string, id: string) {
  return apiRequest<TrainingCheckpoint | null>(
    `/training-runs/${id}/checkpoints/latest`,
    { token },
  )
}

export function saveCheckpoint(
  token: string,
  id: string,
  input: SaveCheckpointInput,
) {
  return apiRequest<TrainingRun>(`/training-runs/${id}/checkpoints`, {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  })
}

export function listMetrics(token: string, id: string) {
  return apiRequest<GenerationMetric[]>(`/training-runs/${id}/metrics`, {
    token,
  })
}
