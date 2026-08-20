import type { TrackProgress } from './progress.ts'

export interface AgentRuntime {
  aliveSeconds: number
  collided: boolean
  traveledDistance: number
}

export function calculateFitness(
  runtime: AgentRuntime,
  progress: TrackProgress,
): number {
  return Math.max(
    0,
    progress.passedCheckpoints * 1000 +
      progress.laps * 5000 +
      runtime.traveledDistance * 2 +
      runtime.aliveSeconds -
      (runtime.collided ? 100 : 0),
  )
}
