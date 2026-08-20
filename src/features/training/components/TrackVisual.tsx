import type { TrackDefinition } from '../domain/track.ts'

interface TrackVisualProps {
  definition: TrackDefinition
}

export function TrackVisual({ definition }: TrackVisualProps) {
  const [groundWidth, groundLength] = definition.groundSize

  return (
    <group>
      <mesh position={[0, -0.11, 0]} receiveShadow>
        <boxGeometry args={[groundWidth, 0.2, groundLength]} />
        <meshStandardMaterial color="#182027" roughness={0.94} />
      </mesh>

      {definition.walls.map((wall) => (
        <mesh
          key={wall.id}
          position={wall.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={wall.size} />
          <meshStandardMaterial
            color="#31414c"
            emissive="#13242a"
            emissiveIntensity={0.25}
            roughness={0.75}
          />
        </mesh>
      ))}

      {definition.checkpoints.map((checkpoint) => (
        <mesh
          key={checkpoint.id}
          position={[
            checkpoint.position[0],
            0.012,
            checkpoint.position[2],
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[checkpoint.size[0], checkpoint.size[2]]} />
          <meshBasicMaterial
            color={checkpoint.index === 0 ? '#72e1b5' : '#d6b45f'}
            transparent
            opacity={0.48}
          />
        </mesh>
      ))}

      <gridHelper
        args={[48, 48, '#25333c', '#1d2931']}
        position={[0, 0.015, 0]}
      />
    </group>
  )
}
