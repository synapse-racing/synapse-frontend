import { Physics } from '@react-three/rapier'
import { Track } from './Track.tsx'
import { Vehicle } from './Vehicle.tsx'
import { prototypeTrack } from '../domain/track.ts'
import type { VehicleTelemetry } from '../types/telemetry.ts'

interface TrainingSceneProps {
  onCheckpoint: (index: number) => void
  onReset: () => void
  onTelemetry: (telemetry: VehicleTelemetry) => void
  resetSignal: number
}

export function TrainingScene(props: TrainingSceneProps) {
  return (
    <>
      <color attach="background" args={['#091016']} />
      <fog attach="fog" args={['#091016', 30, 72]} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#b8d9eb', '#111820', 0.8]} />
      <directionalLight
        position={[12, 20, 8]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={60}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <Physics gravity={[0, -9.81, 0]} timeStep={1 / 60}>
        <Track definition={prototypeTrack} onCheckpoint={props.onCheckpoint} />
        <Vehicle
          track={prototypeTrack}
          onReset={props.onReset}
          onTelemetry={props.onTelemetry}
          resetSignal={props.resetSignal}
        />
      </Physics>
    </>
  )
}
