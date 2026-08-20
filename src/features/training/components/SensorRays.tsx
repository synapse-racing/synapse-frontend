import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import type { RefObject } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  Quaternion,
  Vector3,
} from 'three'
import type { NormalOrGLBufferAttributes } from 'three'
import {
  normalizeSensorDistance,
  sensorAngles,
  sensorDirection,
  sensorMaxDistance,
} from '../domain/sensors.ts'

interface SensorRaysProps {
  bodyRef: RefObject<RapierRigidBody | null>
  interactionGroups?: number
  readingsRef: RefObject<number[]>
  visible?: boolean
}

export function SensorRays({
  bodyRef,
  interactionGroups,
  readingsRef,
  visible = true,
}: SensorRaysProps) {
  const { rapier, world } = useRapier()
  const geometries = useRef<
    (BufferGeometry<NormalOrGLBufferAttributes> | null)[]
  >([])
  const materials = useRef<(LineBasicMaterial | null)[]>([])
  const orientation = useRef(new Quaternion())
  const origin = useRef(new Vector3())
  const direction = useRef(new Vector3())
  const endpoint = useRef(new Vector3())

  useFrame(() => {
    const body = bodyRef.current
    if (!body) return

    const translation = body.translation()
    const rotation = body.rotation()
    orientation.current.set(rotation.x, rotation.y, rotation.z, rotation.w)

    const forward = direction.current
      .set(0, 0, -1)
      .applyQuaternion(orientation.current)
    origin.current
      .set(translation.x, translation.y + 0.12, translation.z)
      .addScaledVector(forward, 1.25)

    sensorAngles.forEach((angle, index) => {
      const localDirection = sensorDirection(angle)
      direction.current
        .set(...localDirection)
        .applyQuaternion(orientation.current)
        .normalize()

      const ray = new rapier.Ray(origin.current, direction.current)
      const hit = world.castRay(
        ray,
        sensorMaxDistance,
        true,
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        interactionGroups,
        undefined,
        body,
      )
      const distance = hit?.timeOfImpact ?? null
      readingsRef.current[index] = normalizeSensorDistance(distance)
      endpoint.current
        .copy(origin.current)
        .addScaledVector(direction.current, distance ?? sensorMaxDistance)

      const geometry = geometries.current[index]
      if (geometry) {
        const positions = geometry.getAttribute('position') as BufferAttribute
        positions.setXYZ(
          0,
          origin.current.x,
          origin.current.y,
          origin.current.z,
        )
        positions.setXYZ(
          1,
          endpoint.current.x,
          endpoint.current.y,
          endpoint.current.z,
        )
        positions.needsUpdate = true
        geometry.computeBoundingSphere()
      }

      materials.current[index]?.color.set(distance === null ? '#72e1b5' : '#ff645f')
    })
  })

  if (!visible) return null

  return sensorAngles.map((angle, index) => (
    <line key={angle}>
      <bufferGeometry
        ref={(geometry) => {
          geometries.current[index] = geometry
        }}
      >
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(6), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        ref={(material) => {
          materials.current[index] = material
        }}
        color="#72e1b5"
        transparent
        opacity={0.9}
      />
    </line>
  ))
}
