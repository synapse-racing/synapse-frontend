import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3 } from 'three'
import { useReducedMotion } from '../game/preferences.ts'
export interface CarPose {
  x: number
  z: number
  yaw: number
}
export type RaceCameraMode = 'overview' | 'follow' | 'free'
export function RaceCamera({
  mode,
  extent = 50,
  getTarget,
}: {
  extent?: number
  mode: RaceCameraMode
  getTarget: () => CarPose | undefined
}) {
  const { camera, size } = useThree()
  const reduced = useReducedMotion()
  const desired = useMemo(() => new Vector3(), [])
  const targetLook = useMemo(() => new Vector3(), [])
  const look = useMemo(
    () =>
      camera
        .getWorldDirection(new Vector3())
        .multiplyScalar(20)
        .add(camera.position),
    [camera],
  )
  const smoothedYaw = useRef<number | null>(null)
  const wasFollowing = useRef(false)

  const orbitTarget = useMemo<[number, number, number]>(
    () => (mode === 'free' ? [look.x, look.y, look.z] : [0, 0, 0]),
    [mode, look],
  )
  useEffect(() => {
    if (mode === 'overview') {
      const fit =
        Math.max(1, extent / 50) * Math.max(1, 1.1 / (size.width / size.height))
      camera.position.set(0, 52 * fit, 46 * fit)
      camera.lookAt(0, 0, 0)
    }
  }, [camera, mode, extent, size.width, size.height])
  useFrame((_, delta) => {
    if (mode !== 'follow') {
      wasFollowing.current = false
      smoothedYaw.current = null
      return
    }
    const target = getTarget()
    if (!target) return

    const dt = Math.min(delta, 0.1)

    if (smoothedYaw.current === null || !wasFollowing.current) {
      smoothedYaw.current = target.yaw
      look.set(target.x, 0.5, target.z)
    } else {
      const angleDiff = Math.atan2(
        Math.sin(target.yaw - smoothedYaw.current),
        Math.cos(target.yaw - smoothedYaw.current),
      )
      smoothedYaw.current += angleDiff * (1 - Math.exp(-6 * dt))

      targetLook.set(
        target.x - (reduced ? 0 : Math.sin(target.yaw) * 2),
        0.5,
        target.z - (reduced ? 0 : Math.cos(target.yaw) * 2),
      )
      look.lerp(targetLook, 1 - Math.exp(-10 * dt))
    }
    wasFollowing.current = true

    const followYaw = reduced ? 0 : smoothedYaw.current
    desired.set(
      target.x + (reduced ? 0 : Math.sin(followYaw) * 10),
      reduced ? 24 : 6.8,
      target.z + (reduced ? 16 : Math.cos(followYaw) * 10),
    )
    camera.position.lerp(desired, 1 - Math.exp(-7 * dt))
    camera.lookAt(look)
  })
  return mode !== 'follow' ? (
    <OrbitControls
      makeDefault
      target={orbitTarget}
      minDistance={mode === 'free' ? 1 : 15}
      maxDistance={Math.max(100, extent * 4)}
      maxPolarAngle={Math.PI / 2.15}
    />
  ) : null
}
