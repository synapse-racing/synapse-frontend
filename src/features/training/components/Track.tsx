import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { TrackDefinition } from '../domain/track.ts'
import { TrackVisual } from './TrackVisual.tsx'

interface TrackProps {
  definition: TrackDefinition
  onCheckpoint: (index: number, rigidBodyName: string) => void
}

export function Track({ definition, onCheckpoint }: TrackProps) {
  const [groundWidth, groundLength] = definition.groundSize

  return (
    <group>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[groundWidth / 2, 0.1, groundLength / 2]}
          position={[0, -0.1, 0]}
          friction={1.2}
        />
      </RigidBody>

      {definition.walls.map((wall) => (
        <RigidBody
          key={wall.id}
          name={`wall-${wall.id}`}
          type="fixed"
          colliders={false}
        >
          <CuboidCollider
            args={[
              wall.size[0] / 2,
              wall.size[1] / 2,
              wall.size[2] / 2,
            ]}
            position={wall.position}
            friction={0.8}
          />
        </RigidBody>
      ))}

      {definition.checkpoints.map((checkpoint) => (
        <group key={checkpoint.id}>
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider
              args={[
                checkpoint.size[0] / 2,
                checkpoint.size[1] / 2,
                checkpoint.size[2] / 2,
              ]}
              position={checkpoint.position}
              sensor
              onIntersectionEnter={({ other }) => {
                const rigidBodyName = other.rigidBodyObject?.name
                if (rigidBodyName) {
                  onCheckpoint(checkpoint.index, rigidBodyName)
                }
              }}
            />
          </RigidBody>
        </group>
      ))}
      <TrackVisual definition={definition} />
    </group>
  )
}
