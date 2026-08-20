import { useFrame } from '@react-three/fiber'
import {
  CuboidCollider,
  interactionGroups,
  RigidBody,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useRef } from 'react'
import { Vector3 } from 'three'
import type { AgentRuntime } from '../domain/fitness.ts'
import type { TrackDefinition } from '../domain/track.ts'
import { evaluateGenome } from '../neat/genome.ts'
import type { Genome } from '../neat/genes.ts'
import {
  applyVehicleControl,
  createVehicleMotionWorkspace,
  vehicleMaxSpeed,
} from '../physics/vehicle-controller.ts'
import { SensorRays } from './SensorRays.tsx'

interface NeatVehicleProps {
  forceFinishSignal: number
  genome: Genome
  index: number
  onFinish: (genomeId: string, runtime: AgentRuntime) => void
  running: boolean
  track: TrackDefinition
}

const agentInteractionGroups = interactionGroups(1, [0])

export function NeatVehicle({
  forceFinishSignal,
  genome,
  index,
  onFinish,
  running,
  track,
}: NeatVehicleProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const readingsRef = useRef([1, 1, 1, 1, 1])
  const motion = useRef(createVehicleMotionWorkspace())
  const previousPosition = useRef(
    new Vector3(...track.spawnPosition),
  )
  const currentPosition = useRef(new Vector3())
  const elapsed = useRef(0)
  const stationaryFor = useRef(0)
  const traveledDistance = useRef(0)
  const finished = useRef(false)
  const observedForceFinish = useRef(forceFinishSignal)

  function finish(collided: boolean) {
    if (finished.current) return
    finished.current = true
    bodyRef.current?.setEnabled(false)
    onFinish(genome.id, {
      aliveSeconds: elapsed.current,
      collided,
      traveledDistance: traveledDistance.current,
    })
  }

  useFrame((_, frameDelta) => {
    const body = bodyRef.current
    if (!body || !running || finished.current) return

    if (forceFinishSignal !== observedForceFinish.current) {
      observedForceFinish.current = forceFinishSignal
      finish(false)
      return
    }

    const delta = Math.min(frameDelta, 0.05)
    const speed = Math.hypot(body.linvel().x, body.linvel().z)
    const [steering, throttle] = evaluateGenome(genome, [
      ...readingsRef.current,
      Math.min(1, speed / vehicleMaxSpeed),
    ])
    const currentSpeed = applyVehicleControl(
      body,
      throttle,
      steering,
      delta,
      motion.current,
    )

    elapsed.current += delta
    stationaryFor.current =
      currentSpeed < 0.35 ? stationaryFor.current + delta : 0

    const translation = body.translation()
    currentPosition.current.set(translation.x, translation.y, translation.z)
    traveledDistance.current += currentPosition.current.distanceTo(
      previousPosition.current,
    )
    previousPosition.current.copy(currentPosition.current)

    if (elapsed.current > 2 && stationaryFor.current > 4) finish(false)
  })

  const hue = (index * 47) % 360
  return (
    <>
      <RigidBody
        ref={bodyRef}
        name={`neat-car:${genome.id}`}
        position={track.spawnPosition}
        rotation={[0, track.spawnYaw, 0]}
        colliders={false}
        enabledRotations={[false, true, false]}
        linearDamping={0.45}
        angularDamping={5.5}
        canSleep={false}
        onCollisionEnter={({ other }) => {
          if (running && other.rigidBodyObject?.name.startsWith('wall-')) {
            finish(true)
          }
        }}
      >
        <CuboidCollider
          args={[0.65, 0.25, 1.2]}
          collisionGroups={agentInteractionGroups}
          solverGroups={agentInteractionGroups}
          friction={0.8}
          restitution={0.08}
        />
        <mesh castShadow={index === 0}>
          <boxGeometry args={[1.3, 0.5, 2.4]} />
          <meshStandardMaterial
            color={`hsl(${hue} 72% 56%)`}
            emissive={index === 0 ? '#214f3d' : '#000000'}
            emissiveIntensity={index === 0 ? 0.8 : 0}
            transparent
            opacity={index === 0 ? 1 : 0.52}
          />
        </mesh>
      </RigidBody>
      <SensorRays
        bodyRef={bodyRef}
        interactionGroups={agentInteractionGroups}
        readingsRef={readingsRef}
        visible={index === 0}
      />
    </>
  )
}
