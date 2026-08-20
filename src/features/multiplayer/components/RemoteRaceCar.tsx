import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils, Mesh } from 'three'
import type { RacePlayerState } from '../types/multiplayer.ts'

interface RemoteRaceCarProps {
  isCurrentUser: boolean
  player: RacePlayerState
}

export function RemoteRaceCar({ isCurrentUser, player }: RemoteRaceCarProps) {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return
    const factor = 1 - Math.exp(-12 * delta)
    mesh.position.x = MathUtils.lerp(mesh.position.x, player.x, factor)
    mesh.position.z = MathUtils.lerp(mesh.position.z, player.z, factor)
    mesh.rotation.y = MathUtils.lerp(mesh.rotation.y, player.yaw, factor)
  })

  const hue = [...player.userId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360
  return (
    <mesh
      ref={meshRef}
      position={[player.x, 0.4, player.z]}
      rotation={[0, player.yaw, 0]}
      castShadow
    >
      <boxGeometry args={[1.3, 0.55, 2.4]} />
      <meshStandardMaterial
        color={`hsl(${hue} 72% 55%)`}
        emissive={isCurrentUser ? '#245944' : '#000000'}
        emissiveIntensity={isCurrentUser ? 0.8 : 0}
        transparent={player.disconnected}
        opacity={player.disconnected ? 0.3 : 1}
      />
    </mesh>
  )
}
