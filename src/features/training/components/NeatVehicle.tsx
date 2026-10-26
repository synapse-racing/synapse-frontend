import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Group } from 'three'
import type { VehicleAppearance } from '../../garage/domain/appearance.ts'
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
  appearance?: VehicleAppearance
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
  appearance,
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
  const previousPose = useRef<CarPose>({
    x: state.current.x,
    z: state.current.z,
    yaw: state.current.yaw,
  })
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
      previousPose.current.x = state.current.x
      previousPose.current.z = state.current.z
      previousPose.current.yaw = state.current.yaw

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

    const alpha = control.finished
      ? 1
      : Math.min(1, Math.max(0, accumulator.current / simulationStepSeconds))
    const prev = previousPose.current
    const curr = state.current
    const renderX = prev.x + (curr.x - prev.x) * alpha
    const renderZ = prev.z + (curr.z - prev.z) * alpha
    const deltaYaw = Math.atan2(
      Math.sin(curr.yaw - prev.yaw),
      Math.cos(curr.yaw - prev.yaw),
    )
    const renderYaw = prev.yaw + deltaYaw * alpha

    if (meshRef.current) {
      meshRef.current.position.set(renderX, 0, renderZ)
      meshRef.current.rotation.y = renderYaw
    }
    onPose(genome.id, { x: renderX, z: renderZ, yaw: renderYaw })
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
          appearance={
            appearance ? { ...appearance, number: index + 1 } : undefined
          }
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
