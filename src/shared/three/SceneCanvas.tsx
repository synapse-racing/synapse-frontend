import { Component, Suspense } from 'react'
import type { PropsWithChildren } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGamePreferences } from '../game/preferences.tsx'
class SceneBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <div className="scene-fallback" role="status">La vista 3D no está disponible. Activa la aceleración gráfica y recarga.</div> : this.props.children }
}
export function SceneCanvas({ children, garage = false }: PropsWithChildren<{ garage?: boolean }>) {
  const { preferences } = useGamePreferences()
  return <SceneBoundary><Canvas shadows={preferences.quality === 'high'} dpr={preferences.quality === 'high' ? [1, 1.5] : 1}
    camera={garage ? { position: [5, 2.8, 6], fov: 36, near: 0.1, far: 80 } : { position: [0, 52, 46], fov: 52, near: 0.1, far: 400 }}
    gl={{ antialias: preferences.quality === 'high', powerPreference: 'high-performance' }}
    fallback={<div className="scene-fallback">Activa la aceleración gráfica para ver el escenario.</div>}
  ><Suspense fallback={null}>{children}</Suspense></Canvas></SceneBoundary>
}
