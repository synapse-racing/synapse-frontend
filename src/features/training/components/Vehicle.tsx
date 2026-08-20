import { useKeyboardControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  CuboidCollider,
  RigidBody,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import { Quaternion, Vector3 } from 'three'
import type { VehicleControlName } from '../domain/controls.ts'
import type { TrackDefinition } from '../domain/track.ts'
import {
  applyVehicleControl,
  createVehicleMotionWorkspace,
} from '../physics/vehicle-controller.ts'
import type { VehicleTelemetry } from '../types/telemetry.ts'
import { SensorRays } from './SensorRays.tsx'

interface VehicleProps {
  onReset: () => void
  onTelemetry: (telemetry: VehicleTelemetry) => void
  resetSignal: number
  track: TrackDefinition
}

function resetRigidBody(body: RapierRigidBody, track: TrackDefinition) {
  const rotation = new Quaternion().setFromAxisAngle(
    new Vector3(0, 1, 0),
    track.spawnYaw,
  )
  body.setTranslation(
    {
      x: track.spawnPosition[0],
      y: track.spawnPosition[1],
      z: track.spawnPosition[2],
    },
    true,
  )
  body.setRotation(rotation, true)
  body.setLinvel({ x: 0, y: 0, z: 0 }, true)
  body.setAngvel({ x: 0, y: 0, z: 0 }, true)
}

export function Vehicle({
  onReset,
  onTelemetry,
  resetSignal,
  track,
}: VehicleProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const readingsRef = useRef([1, 1, 1, 1, 1])
  const [, getControls] = useKeyboardControls<VehicleControlName>()
  const motion = useRef(createVehicleMotionWorkspace())
  const position = useRef(new Vector3())
  const cameraPosition = useRef(new Vector3())
  const cameraTarget = useRef(new Vector3())
  const resetPressed = useRef(false)
  const lastTelemetryAt = useRef(0)

  useEffect(() => {
    if (bodyRef.current) resetRigidBody(bodyRef.current, track)
  }, [resetSignal, track])

  useFrame(({ camera, clock }, frameDelta) => {
    const body = bodyRef.current
    if (!body) return

    const delta = Math.min(frameDelta, 0.05)
    const controls = getControls()
    const throttle = Number(controls.forward) - Number(controls.reverse)
    const steering = Number(controls.left) - Number(controls.right)
    const planarSpeed = applyVehicleControl(
      body,
      throttle,
      steering,
      delta,
      motion.current,
    )

    if (controls.reset && !resetPressed.current) {
      resetRigidBody(body, track)
      onReset()
    }
    resetPressed.current = controls.reset

    const translation = body.translation()
    position.current.set(translation.x, translation.y, translation.z)
    cameraPosition.current
      .copy(position.current)
      .addScaledVector(motion.current.forward, -7)
    cameraPosition.current.y += 4.2
    camera.position.lerp(cameraPosition.current, 1 - Math.exp(-5 * delta))
    cameraTarget.current
      .copy(position.current)
      .addScaledVector(motion.current.forward, 3.5)
    camera.lookAt(cameraTarget.current)

    if (clock.elapsedTime - lastTelemetryAt.current >= 0.1) {
      lastTelemetryAt.current = clock.elapsedTime
      onTelemetry({
        speed: planarSpeed,
        sensors: [...readingsRef.current],
      })
    }
  })

  return (
    <>
      <RigidBody
        ref={bodyRef}
        name="player-car"
        position={track.spawnPosition}
        rotation={[0, track.spawnYaw, 0]}
        colliders={false}
        enabledRotations={[false, true, false]}
        linearDamping={0.45}
        angularDamping={5.5}
        canSleep={false}
      >
        <CuboidCollider
          args={[0.65, 0.25, 1.2]}
          friction={0.8}
          restitution={0.08}
        />
        <group>
          <mesh castShadow>
            <boxGeometry args={[1.3, 0.5, 2.4]} />
            <meshStandardMaterial color="#df3f36" metalness={0.35} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.34, 0.15]} castShadow>
            <boxGeometry args={[1.02, 0.32, 1.15]} />
            <meshStandardMaterial color="#18252e" metalness={0.5} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.05, -1.23]}>
            <boxGeometry args={[0.72, 0.12, 0.08]} />
            <meshBasicMaterial color="#f5d36d" />
          </mesh>
        </group>
      </RigidBody>
      <SensorRays bodyRef={bodyRef} readingsRef={readingsRef} />
    </>
  )
}
