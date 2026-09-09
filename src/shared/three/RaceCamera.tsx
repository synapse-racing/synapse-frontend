import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Vector3 } from 'three'
import { useReducedMotion } from '../game/preferences.ts'
export interface CarPose {
  x: number
  z: number
  yaw: number
}
export function RaceCamera({
  mode,
  getTarget,
}: {
  mode: 'overview' | 'follow'
  getTarget: () => CarPose | undefined
}) {
  const { camera, size } = useThree()
  const reduced = useReducedMotion()
  const desired = useMemo(() => new Vector3(), [])
  const look = useMemo(() => new Vector3(), [])
  useEffect(() => {
    if (mode === 'overview') {
      const fit = Math.max(1, 1.1 / (size.width / size.height))
      camera.position.set(0, 52 * fit, 46 * fit)
      camera.lookAt(0, 0, 0)
    }
  }, [camera, mode, size.width, size.height])
  useFrame((_, delta) => {
    if (mode !== 'follow') return
    const target = getTarget()
    if (!target) return
    desired.set(
      target.x + (reduced ? 0 : Math.sin(target.yaw) * 10),
      reduced ? 24 : 7,
      target.z + (reduced ? 16 : Math.cos(target.yaw) * 10),
    )
    camera.position.lerp(desired, 1 - Math.exp(-5 * Math.min(delta, 0.1)))
    look.set(target.x, 0.5, target.z)
    camera.lookAt(look)
  })
  return mode === 'overview' ? (
    <OrbitControls
      makeDefault
      target={[0, 0, 0]}
      minDistance={15}
      maxDistance={100}
      maxPolarAngle={Math.PI / 2.15}
    />
  ) : null
}
