import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three'
export function RaceCarModel({
  color = '#ff692f',
  selected = false,
  getSpeed,
  faded = false,
}: {
  color?: string
  selected?: boolean
  getSpeed?: () => number
  faded?: boolean
}) {
  const { scene } = useGLTF('/models/raceCarOrange.glb')
  const { model, wheels, materials } = useMemo(() => {
    const model = scene.clone(true)
    const materials: MeshStandardMaterial[] = []
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return
      object.castShadow = true
      object.receiveShadow = true
      const clone = (original: MeshStandardMaterial) => {
        const material = original.clone()
        if (material.name === 'pylon') {
          material.color.set(color)
          material.metalness = 0.28
          material.roughness = 0.35
        }
        if (material.name === 'glass') {
          material.color.set('#172a32')
          material.metalness = 0.5
          material.roughness = 0.18
        }
        if (material.name === 'carTire') material.color.set('#202420')
        material.transparent = faded
        material.opacity = faded ? 0.35 : 1
        materials.push(material)
        return material
      }
      object.material = Array.isArray(object.material)
        ? object.material.map((m) => clone(m as MeshStandardMaterial))
        : clone(object.material as MeshStandardMaterial)
    })
    // Assets face +Z; the simulation faces -Z. Normalize the footprint in every mode.
    model.rotation.y = Math.PI
    model.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(model)
    model.scale.setScalar(2.4 / bounds.getSize(new Vector3()).z)
    model.updateMatrixWorld(true)
    bounds.setFromObject(model)
    const center = bounds.getCenter(new Vector3())
    model.position.set(-center.x, -bounds.min.y + 0.025, -center.z)
    const wheels = model.children
      .flatMap((child) => [child, ...child.children])
      .filter((child) => child.name.startsWith('wheel'))
    return { model, wheels, materials }
  }, [scene, color, faded])
  useEffect(
    () => () => materials.forEach((material) => material.dispose()),
    [materials],
  )
  useFrame((_, delta) => {
    const rotation = ((getSpeed?.() ?? 0) * Math.min(delta, 0.1)) / 0.25
    wheels.forEach((wheel) => {
      wheel.rotation.x += rotation
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
