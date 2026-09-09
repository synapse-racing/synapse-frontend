import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { RaceCarModel } from '../../../shared/three/RaceCarModel.tsx'
import type { CarPose } from '../../../shared/three/RaceCamera.tsx'
import type { AgentRuntime } from '../domain/fitness.ts'
import type { TrackDefinition } from '../domain/track.ts'
import { evaluateGenome } from '../neat/genome.ts'
import type { Genome } from '../neat/genes.ts'
import {
  createSimulationState,
  senseSimulation,
  simulationMaxSeconds,
  simulationStepSeconds,
  stepSimulation,
} from '../simulation/race-contract.ts'

interface NeatVehicleProps {
  genome: Genome
  index: number
  onFinish: (genomeId: string, runtime: AgentRuntime) => void
  onCheckpoint: (index: number, rigidBodyName: string) => void
  running: boolean
  track: TrackDefinition
  selected: boolean
  onPose: (id: string, pose: CarPose) => void
}

export function NeatVehicle({
  genome,
  index,
  onFinish,
  onCheckpoint,
  running,
  track,
  selected,
  onPose,
}: NeatVehicleProps) {
  const meshRef = useRef<Group>(null)
  const state = useRef(
    createSimulationState(track),
  )
  const accumulator = useRef(0)
  const finished = useRef(false)

  useFrame((_, frameDelta) => {
    if (!running || finished.current) return
    accumulator.current += Math.min(frameDelta, 0.25)
    while (accumulator.current >= simulationStepSeconds && !finished.current) {
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
        finished.current = true
        onFinish(genome.id, {
          aliveSeconds: Math.min(
            simulationMaxSeconds,
            simulation.elapsedSteps * simulationStepSeconds,
          ),
          collided: simulation.collided,
          traveledDistance: simulation.traveledDistance,
        })
      }
      accumulator.current -= simulationStepSeconds
    }

    if (meshRef.current) {
      meshRef.current.position.set(state.current.x, 0, state.current.z)
      meshRef.current.rotation.y = state.current.yaw
    }
    onPose(genome.id, state.current)
  })

  const hue = (index * 47) % 360
  return (
    <group
      ref={meshRef}
      position={[state.current.x, 0, state.current.z]}
      rotation={[0, state.current.yaw, 0]}
    >
      <RaceCarModel color={`hsl(${hue},72%,56%)`} selected={selected} getSpeed={() => finished.current || !running ? 0 : state.current.speed} />
    </group>
  )
}
