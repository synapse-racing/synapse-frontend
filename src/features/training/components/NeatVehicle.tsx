import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import { RaceCarModel } from '../../../shared/three/RaceCarModel.tsx'
import { SensorRays } from './SensorRays.tsx'
import type { CarPose } from '../../../shared/three/RaceCamera.tsx'
import type { AgentRuntime } from '../domain/fitness.ts'
import type { TrackDefinition } from '../domain/track.ts'
import { evaluateGenome } from '../neat/genome.ts'
import type { Genome } from '../neat/genes.ts'
import {
  createAgentControl,
  type AgentFinishReason,
  type RegisterAgentControl,
} from '../domain/agent-control.ts'
import {
  createSimulationState,
  senseSimulation,
  simulationStepSeconds,
  stepSimulation,
} from '../simulation/race-contract.ts'

interface NeatVehicleProps {
  genome: Genome
  index: number
  onFinish: (
    genomeId: string,
    runtime: AgentRuntime,
    reason?: AgentFinishReason,
  ) => void
  onInspect: (genomeId: string) => void
  onRegister: RegisterAgentControl
  onCheckpoint: (index: number, rigidBodyName: string) => void
  timeScale: number
  running: boolean
  track: TrackDefinition
  selected: boolean
  showRaycasts: boolean
  onPose: (id: string, pose: CarPose) => void
}

export function NeatVehicle({
  genome,
  index,
  onFinish,
  onCheckpoint,
  timeScale,
  running,
  track,
  selected,
  showRaycasts,
  onPose,
  onInspect,
  onRegister,
}: NeatVehicleProps) {
  const meshRef = useRef<Group>(null)
  const state = useRef(createSimulationState(track))
  const accumulator = useRef(0)
  const latestFinish = useRef(onFinish)
  latestFinish.current = onFinish
  const control = useMemo(
    () =>
      createAgentControl(state.current, track, (runtime, reason) =>
        latestFinish.current(genome.id, runtime, reason),
      ),
    [track, genome.id],
  )
  useEffect(
    () => onRegister(genome.id, control),
    [genome.id, control, onRegister],
  )

  useFrame((_, frameDelta) => {
    if (!running || control.finished) return
    accumulator.current += Math.min(frameDelta, 0.25) * timeScale
    while (accumulator.current >= simulationStepSeconds && !control.finished) {
      const simulation = state.current
      const [steering, throttle] = evaluateGenome(genome, [
        ...senseSimulation(simulation, track),
        Math.min(1, Math.abs(simulation.speed) / 13),
      ])
      const result = stepSimulation(simulation, steering, throttle, track)
      result.checkpointEntries.forEach((checkpoint) =>
        onCheckpoint(checkpoint, `neat-car:${genome.id}`),
      )
      if (result.finished) {
        control.finish(
          simulation.collided
            ? 'collision'
            : simulation.laps >= 1
              ? 'finished'
              : result.stalled
                ? 'stalled'
                : 'timeout',
        )
      }
      accumulator.current -= simulationStepSeconds
    }

    if (meshRef.current) {
      meshRef.current.position.set(state.current.x, 0, state.current.z)
      meshRef.current.rotation.y = state.current.yaw
    }
    onPose(genome.id, state.current)
  }, -1)

  const hue = (index * 47) % 360
  return (
    <>
      <group
        ref={meshRef}
        position={[state.current.x, 0, state.current.z]}
        rotation={[0, state.current.yaw, 0]}
        onClick={(event) => {
          if (event.button !== 0 || event.delta > 5) return
          event.stopPropagation()
          onInspect(genome.id)
        }}
      >
        <RaceCarModel
          color={`hsl(${hue},72%,56%)`}
          selected={selected}
          faded={control.reason === 'manual'}
          getSpeed={() =>
            control.finished || !running ? 0 : state.current.speed
          }
        />
      </group>
      {showRaycasts && (
        <SensorRays
          getState={() => state.current}
          track={track}
          selected={selected}
        />
      )}
    </>
  )
}
