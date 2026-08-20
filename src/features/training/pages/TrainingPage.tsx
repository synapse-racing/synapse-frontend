import { KeyboardControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useState } from 'react'
import type { KeyboardControlsEntry } from '@react-three/drei'
import { TrainingHud } from '../components/TrainingHud.tsx'
import { TrainingScene } from '../components/TrainingScene.tsx'
import {
  advanceTrackProgress,
  initialTrackProgress,
  type TrackProgress,
} from '../domain/progress.ts'
import { prototypeTrack } from '../domain/track.ts'
import {
  vehicleControlNames,
  type VehicleControlName,
} from '../domain/controls.ts'
import {
  initialTelemetry,
  type VehicleTelemetry,
} from '../types/telemetry.ts'

const keyboardMap: KeyboardControlsEntry<VehicleControlName>[] = [
  { name: vehicleControlNames.forward, keys: ['KeyW', 'ArrowUp'] },
  { name: vehicleControlNames.reverse, keys: ['KeyS', 'ArrowDown'] },
  { name: vehicleControlNames.left, keys: ['KeyA', 'ArrowLeft'] },
  { name: vehicleControlNames.right, keys: ['KeyD', 'ArrowRight'] },
  { name: vehicleControlNames.reset, keys: ['KeyR'] },
]

export function TrainingPage() {
  const [progress, setProgress] = useState<TrackProgress>(initialTrackProgress)
  const [telemetry, setTelemetry] = useState<VehicleTelemetry>(initialTelemetry)
  const [resetSignal, setResetSignal] = useState(0)

  function resetSimulation() {
    setProgress(initialTrackProgress)
    setTelemetry(initialTelemetry)
    setResetSignal((value) => value + 1)
  }

  function registerCheckpoint(index: number) {
    setProgress((current) =>
      advanceTrackProgress(current, index, prototypeTrack.checkpoints.length),
    )
  }

  return (
    <KeyboardControls map={keyboardMap}>
      <main className="training-lab">
        <Canvas
          shadows
          camera={{ position: [-10, 5, 20], fov: 58, near: 0.1, far: 120 }}
          dpr={[1, 1.5]}
        >
          <Suspense fallback={null}>
            <TrainingScene
              onCheckpoint={registerCheckpoint}
              onReset={resetSimulation}
              onTelemetry={setTelemetry}
              resetSignal={resetSignal}
            />
          </Suspense>
        </Canvas>
        <TrainingHud
          checkpointCount={prototypeTrack.checkpoints.length}
          onReset={resetSimulation}
          progress={progress}
          telemetry={telemetry}
        />
      </main>
    </KeyboardControls>
  )
}
