import { Component, Suspense } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFShadowMap } from 'three'
import { useGamePreferences } from '../game/preferences.ts'
class SceneBoundary extends Component<
  PropsWithChildren<{ fallback?: ReactNode }>,
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed
      ? (this.props.fallback ?? (
          <div className="scene-fallback" role="status">
            La vista 3D no está disponible. Activa la aceleración gráfica y
            recarga.
          </div>
        ))
      : this.props.children
  }
}
export function SceneCanvas({
  children,
  frameloop = 'always',
  fallback,
}: PropsWithChildren<{
  frameloop?: 'always' | 'demand'
  fallback?: ReactNode
}>) {
  const { preferences } = useGamePreferences()
  return (
    <SceneBoundary fallback={fallback}>
      <Canvas
        frameloop={frameloop}
        shadows={
          preferences.quality === 'high' ? { type: PCFShadowMap } : false
        }
        dpr={preferences.quality === 'high' ? [1, 1.5] : 1}
        camera={{ position: [0, 52, 46], fov: 52, near: 0.1, far: 2000 }}
        gl={{
          antialias: preferences.quality === 'high',
          powerPreference: 'high-performance',
        }}
        fallback={
          fallback ?? (
            <div className="scene-fallback">
              Activa la aceleración gráfica para ver el escenario.
            </div>
          )
        }
      >
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </SceneBoundary>
  )
}
