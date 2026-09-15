import { useRef } from 'react'
import type { AgentRuntime } from '../domain/fitness.ts'
import type { TrackDefinition } from '../domain/track.ts'
import type { Genome } from '../neat/genes.ts'
import { NeatVehicle } from './NeatVehicle.tsx'
import { TrackEnvironment } from '../../../shared/three/TrackEnvironment.tsx'
import { RaceCamera, type CarPose } from '../../../shared/three/RaceCamera.tsx'

interface NeatTrainingSceneProps {
  generationKey: string
  genomes: Genome[]
  onAgentFinish: (genomeId: string, runtime: AgentRuntime) => void
  onCheckpoint: (index: number, rigidBodyName: string) => void
  running: boolean
  track: TrackDefinition
  cameraMode: 'overview' | 'follow'
  selectedGenomeId: string
  showRaycasts: boolean
}

export function NeatTrainingScene({
  generationKey,
  genomes,
  onAgentFinish,
  onCheckpoint,
  running,
  track,
  cameraMode,
  selectedGenomeId,
  showRaycasts,
}: NeatTrainingSceneProps) {
  const poses = useRef(new Map<string, CarPose>())
  return (
    <>
      <TrackEnvironment track={track} theme="desert" />
      {genomes.map((genome, index) => (
        <NeatVehicle
          key={`${generationKey}-${genome.id}`}
          genome={genome}
          index={index}
          onFinish={onAgentFinish}
          onCheckpoint={onCheckpoint}
          running={running}
          track={track}
          selected={genome.id === selectedGenomeId}
          showRaycasts={showRaycasts}
          onPose={(id, pose) => poses.current.set(id, pose)}
        />
      ))}
      <RaceCamera
          extent={Math.max(...track.groundSize)}
        mode={cameraMode}
        getTarget={() =>
          poses.current.get(selectedGenomeId) ?? {
            x: track.spawnPosition[0],
            z: track.spawnPosition[2],
            yaw: track.spawnYaw,
          }
        }
      />
    </>
  )
}
