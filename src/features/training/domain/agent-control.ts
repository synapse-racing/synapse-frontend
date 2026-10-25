import type { AgentRuntime } from './fitness.ts'
import type { TrackDefinition } from './track.ts'
import {
  raceTimeLimit,
  simulationStepSeconds,
  type SimulationState,
} from '../simulation/race-contract.ts'

export type AgentFinishReason =
  'finished' | 'collision' | 'stalled' | 'timeout' | 'manual'

export function createAgentControl(
  state: SimulationState,
  track: TrackDefinition,
  onFinish: (runtime: AgentRuntime, reason: AgentFinishReason) => void,
) {
  let reason: AgentFinishReason | null = null
  const runtime = (): AgentRuntime => ({
    aliveSeconds: Math.min(
      raceTimeLimit(track),
      state.elapsedSteps * simulationStepSeconds,
    ),
    traveledDistance: state.traveledDistance,
    collided: state.collided,
  })
  return {
    get finished() {
      return reason !== null
    },
    get reason() {
      return reason
    },
    runtime,
    finish(next: AgentFinishReason = 'manual') {
      if (reason !== null) return false
      reason = next
      onFinish(runtime(), reason)
      return true
    },
  }
}

export type AgentControl = ReturnType<typeof createAgentControl>
export type RegisterAgentControl = (
  id: string,
  control: AgentControl,
) => () => void
