import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils, Group } from 'three'
import { RaceCarModel } from '../../../shared/three/RaceCarModel.tsx'
import type { CarPose } from '../../../shared/three/RaceCamera.tsx'
import type { RacePlayerState } from '../types/multiplayer.ts'

interface RemoteRaceCarProps {
  isCurrentUser: boolean
  player: RacePlayerState
  onPose?: (id: string, pose: CarPose) => void
}

export function RemoteRaceCar({
  isCurrentUser,
  player,
  onPose,
}: RemoteRaceCarProps) {
  const meshRef = useRef<Group>(null)

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const factor = 1 - Math.exp(-12 * delta)
    mesh.position.x = MathUtils.lerp(mesh.position.x, player.x, factor)
    mesh.position.z = MathUtils.lerp(mesh.position.z, player.z, factor)
    const angle = Math.atan2(
      Math.sin(player.yaw - mesh.rotation.y),
      Math.cos(player.yaw - mesh.rotation.y),
    )
    mesh.rotation.y += angle * factor
    onPose?.(player.userId, {
      x: mesh.position.x,
      z: mesh.position.z,
      yaw: mesh.rotation.y,
    })
  })

  const hue =
    [...player.userId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360
  return (
    <group
      ref={meshRef}
      position={[player.x, 0, player.z]}
      rotation={[0, player.yaw, 0]}
    >
      <RaceCarModel
        color={`hsl(${hue},72%,55%)`}
        selected={isCurrentUser}
        faded={player.disconnected || player.eliminated}
        getSpeed={() =>
          player.eliminated || player.finishedAt || player.disconnected
            ? 0
            : player.speed
        }
      />
    </group>
  )
}
