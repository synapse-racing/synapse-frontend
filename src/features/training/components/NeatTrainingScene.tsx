import { OrbitControls } from '@react-three/drei'
import type { AgentRuntime } from '../domain/fitness.ts'
import type { TrackDefinition } from '../domain/track.ts'
import type { Genome } from '../neat/genes.ts'
import { NeatVehicle } from './NeatVehicle.tsx'
import { TrackVisual } from './TrackVisual.tsx'

interface NeatTrainingSceneProps {
  generationKey: string
  genomes: Genome[]
  onAgentFinish: (genomeId: string, runtime: AgentRuntime) => void
  onCheckpoint: (index: number, rigidBodyName: string) => void
  running: boolean
  track: TrackDefinition
}

export function NeatTrainingScene({
  generationKey,
  genomes,
  onAgentFinish,
  onCheckpoint,
  running,
  track,
}: NeatTrainingSceneProps) {
  return (
    <>
      <color attach="background" args={['#070d12']} />
      <fog attach="fog" args={['#070d12', 38, 85]} />
      <ambientLight intensity={0.75} />
      <hemisphereLight args={['#b8d9eb', '#111820', 0.8]} />
      <directionalLight position={[12, 24, 8]} intensity={2} castShadow />
      <TrackVisual definition={track} />
      {genomes.map((genome, index) => (
        <NeatVehicle
          key={`${generationKey}-${genome.id}`}
          genome={genome}
          index={index}
          onFinish={onAgentFinish}
          onCheckpoint={onCheckpoint}
          running={running}
          track={track}
        />
      ))}
      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        minDistance={24}
        maxDistance={65}
        maxPolarAngle={Math.PI / 2.15}
      />
    </>
  )
}
