import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Group, Mesh, MeshStandardMaterial } from 'three'
import {
  defaultAppearance,
  type VehicleAppearance,
} from '../../features/garage/domain/appearance.ts'
import {
  getCarGeometry,
  getNumberGeometry,
  numberPlateGeometry,
  rimGeometry,
  tireGeometry,
  type BodyPart,
} from './vehicles/geometry.ts'

const finishes = {
  matte: { metalness: 0.08, roughness: 0.82 },
  satin: { metalness: 0.28, roughness: 0.4 },
  metallic: { metalness: 0.68, roughness: 0.23 },
}

function fixedMaterials(faded: boolean) {
  const opacity = faded ? 0.35 : 1
  const material = (
    color: string,
    metalness: number,
    roughness: number,
    emissive?: string,
  ) =>
    new MeshStandardMaterial({
      color,
      metalness,
      roughness,
      transparent: faded,
      opacity,
      emissive,
      emissiveIntensity: emissive ? 0.8 : 0,
    })
  return {
    glass: material('#183239', 0.6, 0.16),
    carbon: material('#151b1c', 0.18, 0.65),
    metal: material('#8a9799', 0.7, 0.3),
    lights: material('#dcefff', 0.15, 0.25, '#b4dfff'),
    rearLights: material('#ee392a', 0.1, 0.35, '#e93020'),
    tire: material('#151719', 0, 0.95),
    plate: material('#f4ead3', 0.05, 0.6),
    number: material('#17201e', 0.05, 0.6),
  }
}

// Catalog geometry and neutral materials are shared by every car in a race.
const neutralMaterials = {
  normal: fixedMaterials(false),
  faded: fixedMaterials(true),
}

export function RaceCarModel({
  appearance,
  color = '#ff692f',
  selected = false,
  getSpeed,
  faded = false,
}: {
  appearance?: VehicleAppearance
  color?: string
  selected?: boolean
  getSpeed?: () => number
  faded?: boolean
}) {
  const modelId = appearance?.modelId ?? defaultAppearance.modelId
  const primaryColor = appearance?.primaryColor ?? color
  const secondaryColor =
    appearance?.secondaryColor ?? defaultAppearance.secondaryColor
  const rimColor = appearance?.rimColor ?? defaultAppearance.rimColor
  const finish = appearance?.finish ?? defaultAppearance.finish
  const livery = appearance?.livery ?? defaultAppearance.livery
  const number = appearance?.number ?? defaultAppearance.number
  const paint = useMemo(() => {
    const settings = {
      ...finishes[finish],
      transparent: faded,
      opacity: faded ? 0.35 : 1,
    }
    return {
      primary: new MeshStandardMaterial({ ...settings, color: primaryColor }),
      secondary: new MeshStandardMaterial({
        ...settings,
        color: secondaryColor,
      }),
      rim: new MeshStandardMaterial({
        color: rimColor,
        metalness: 0.65,
        roughness: 0.3,
        transparent: faded,
        opacity: faded ? 0.35 : 1,
      }),
    }
  }, [primaryColor, secondaryColor, rimColor, finish, faded])
  const { model, wheels } = useMemo(() => {
    const geometry = getCarGeometry(modelId)
    const neutral = neutralMaterials[faded ? 'faded' : 'normal']
    const model = new Group()
    model.name = `vehicle:${modelId}`
    model.scale.setScalar(geometry.scale)
    const materials: Record<BodyPart, MeshStandardMaterial> = {
      left: paint.primary,
      right: livery === 'split' ? paint.secondary : paint.primary,
      accent: paint.secondary,
      stripe: paint.secondary,
      glass: neutral.glass,
      carbon: neutral.carbon,
      metal: neutral.metal,
      lights: neutral.lights,
      rearLights: neutral.rearLights,
    }
    for (const [name, part] of Object.entries(geometry.body)) {
      if (name === 'stripe' && livery !== 'stripe') continue
      const mesh = new Mesh(part, materials[name as BodyPart])
      mesh.castShadow = true
      mesh.receiveShadow = true
      model.add(mesh)
    }
    const wheels = geometry.wheelPositions.map((position) => {
      const wheel = new Group()
      wheel.position.set(...position)
      const tire = new Mesh(tireGeometry, neutral.tire)
      const rim = new Mesh(rimGeometry, paint.rim)
      tire.castShadow = true
      rim.castShadow = true
      wheel.add(tire, rim)
      model.add(wheel)
      return wheel
    })
    const plate = new Group()
    plate.position.set(...geometry.numberPosition)
    plate.rotation.set(-Math.PI / 2, 0, Math.PI)
    plate.scale.setScalar(geometry.numberScale)
    plate.add(
      new Mesh(numberPlateGeometry, neutral.plate),
      new Mesh(getNumberGeometry(number), neutral.number),
    )
    model.add(plate)
    return { model, wheels }
  }, [modelId, paint, livery, number, faded])
  useEffect(
    () => () => Object.values(paint).forEach((material) => material.dispose()),
    [paint],
  )
  useFrame((_, delta) => {
    const rotation = ((getSpeed?.() ?? 0) * Math.min(delta, 0.1)) / 0.23
    wheels.forEach((wheel) => {
      wheel.rotation.x -= rotation
    })
  })
  return (
    <group>
      <primitive object={model} dispose={null} />
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
