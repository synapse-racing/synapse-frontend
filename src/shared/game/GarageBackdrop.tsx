import { lazy, Suspense } from 'react'
const GarageScene = lazy(() => import('../three/GarageScene.tsx'))
export function GarageBackdrop() {
  return <div className="garage-backdrop" aria-hidden="true"><Suspense fallback={<div className="garage-loading" />}><GarageScene /></Suspense></div>
}
