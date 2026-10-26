import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Group } from 'three'
import type { SnapshotTimeline } from '../domain/snapshotTimeline.ts'
import { RaceCarModel } from '../../../shared/three/RaceCarModel.tsx'
import type { CarPose } from '../../../shared/three/RaceCamera.tsx'
import type { RacePlayerState } from '../types/multiplayer.ts'

interface RemoteRaceCarProps {
  isCurrentUser: boolean
  player: RacePlayerState
  timeline: SnapshotTimeline
  onPose?: (id: string, pose: CarPose) => void
  onSelect?: (id: string) => void
  selected?: boolean
}

export function RemoteRaceCar({
  isCurrentUser,
  player,
  timeline,
  onPose,
  onSelect,
  selected,
}: RemoteRaceCarProps) {
  const meshRef = useRef<Group>(null)
  const speed = useRef(0)

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const pose = timeline.sample(player.userId, performance.now()) ?? player
    mesh.position.set(pose.x, 0, pose.z)
    mesh.rotation.y = pose.yaw
    speed.current =
      pose.eliminated || pose.finishedAt !== null || pose.disconnected
        ? 0
        : pose.speed
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
      onClick={(event) => {
        if (event.button !== 0 || event.delta > 5) return
        event.stopPropagation()
        onSelect?.(player.userId)
      }}
    >
      <RaceCarModel
        appearance={player.appearance}
        color={`hsl(${hue},72%,55%)`}
        selected={selected ?? isCurrentUser}
        faded={player.disconnected || player.eliminated}
        getSpeed={() => speed.current}
      />
    </group>
  )
}
