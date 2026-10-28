import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  defaultAppearance,
  type VehicleAppearance,
} from '../../features/garage/domain/appearance.ts'
import { useGamePreferences } from '../game/preferences.ts'
import { createVehicleMaterials } from './vehicles/materials.ts'
import { animateVehicleWheels, createVehicleRig } from './vehicles/rig.ts'
import { wheelMotion, type VehiclePose } from './vehicles/motion.ts'

export function RaceCarModel({
  appearance,
  color = '#ff692f',
  selected = false,
  getSpeed,
  faded = false,
  steerAngle,
  getSteerAngle,
  detail = 'low',
}: {
  appearance?: VehicleAppearance
  color?: string
  selected?: boolean
  getSpeed?: () => number
  faded?: boolean
  steerAngle?: number
  getSteerAngle?: () => number
  detail?: 'high' | 'low'
}) {
  const { preferences } = useGamePreferences()
  const modelId = appearance?.modelId ?? defaultAppearance.modelId
  const level = preferences.quality === 'high' ? detail : 'low'
  const { scene } = useGLTF(
    `${import.meta.env.BASE_URL}models/vehicles/${modelId}-${level}.glb`,
  )
  const primaryColor = appearance?.primaryColor ?? color
  const secondaryColor =
    appearance?.secondaryColor ?? defaultAppearance.secondaryColor
  const rimColor = appearance?.rimColor ?? defaultAppearance.rimColor
  const finish = appearance?.finish ?? defaultAppearance.finish
  const livery = appearance?.livery ?? defaultAppearance.livery
  const number = appearance?.number ?? defaultAppearance.number
  const materials = useMemo(
    () =>
      createVehicleMaterials(
        {
          modelId,
          primaryColor,
          secondaryColor,
          rimColor,
          finish,
          livery,
          number,
        },
        faded,
      ),
    [
      modelId,
      primaryColor,
      secondaryColor,
      rimColor,
      finish,
      livery,
      number,
      faded,
    ],
  )
  const rig = useMemo(
    () => createVehicleRig(scene, materials, number, faded),
    [scene, materials, number, faded],
  )
  const motion = useMemo(
    () => ({
      previous: null as VehiclePose | null,
      steering: 0,
      wheelbase: Math.abs(
        rig.wheels.find((wheel) => wheel.front)!.steer.position.z -
          rig.wheels.find((wheel) => !wheel.front)!.steer.position.z,
      ),
    }),
    [rig],
  )
  useEffect(
    () => () => {
      rig.dispose()
      Object.values(materials).forEach((material) => material.dispose())
    },
    [rig, materials],
  )
  useFrame((_, delta) => {
    rig.model.updateWorldMatrix(true, false)
    const elements = rig.model.matrixWorld.elements
    const pose = {
      x: elements[12],
      z: elements[14],
      yaw: Math.atan2(elements[8], elements[10]),
    }
    const scale = Math.hypot(elements[8], elements[9], elements[10])
    const sampled = motion.previous
      ? wheelMotion(motion.previous, pose, motion.wheelbase, scale)
      : { distance: 0, steering: 0 }
    if (sampled.distance)
      motion.steering +=
        (sampled.steering - motion.steering) * (1 - Math.exp(-12 * delta))
    motion.previous = pose
    animateVehicleWheels(
      rig,
      sampled.distance || (getSpeed?.() ?? 0) * Math.min(delta, 0.1),
      getSteerAngle?.() ?? steerAngle ?? motion.steering,
    )
  })
  return (
    <group>
      <primitive object={rig.model} dispose={null} />
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.022, 0]}>
          <ringGeometry args={[1.45, 1.52, 40]} />
          <meshBasicMaterial
            color="#fff0bd"
            transparent
            opacity={0.85}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
