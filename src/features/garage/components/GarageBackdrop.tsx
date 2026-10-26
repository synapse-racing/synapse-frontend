import { lazy, Suspense, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { SceneCanvas } from '../../../shared/three/SceneCanvas.tsx'
import type { VehicleAppearance } from '../domain/appearance.ts'
import './garage-scene.css'

const GarageScene = lazy(() => import('./GarageScene.tsx'))

export interface GarageBackdropProps {
  appearance: VehicleAppearance
  interactive: boolean
  theme?: 'desert' | 'tournament'
  paused?: boolean
  reduced?: boolean
  resetViewKey?: number
}

function GaragePoster({ appearance }: { appearance: VehicleAppearance }) {
  return (
    <div
      className="garage-poster"
      style={{ '--garage-paint': appearance.primaryColor } as CSSProperties}
    >
      <div className="garage-poster__lights" />
      <svg viewBox="0 0 900 620" role="presentation" aria-hidden="true">
        <ellipse cx="550" cy="430" rx="250" ry="46" fill="#0009" />
        <g transform="translate(260 250)">
          <path
            d="M12 129 86 95 180 81 225 20 337 15 406 84 469 108 492 158 477 183 39 185Z"
            fill="var(--garage-paint)"
          />
          <path d="m191 82 46-52 89-1 58 55Z" fill="#91b2b9" />
          <path d="m204 77 38-39 27-1-10 42Z" fill="#c9e0d8" opacity=".8" />
          <path d="m16 145 467 6-3 24-443 1Z" fill="#101a1e" />
          <path d="m42 126 85-20 6 15-88 18Z" fill="#ecf6e8" />
          <path d="m403 91 67 21 7 12-72-10Z" fill="#fff0c6" />
          {[105, 392].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="168" rx="41" ry="50" fill="#0a1115" />
              <ellipse
                cx={x}
                cy="168"
                rx="25"
                ry="32"
                fill={appearance.rimColor}
              />
              <ellipse cx={x} cy="168" rx="11" ry="16" fill="#283536" />
            </g>
          ))}
          <path
            d="m155 98 210-5-2 15-210 7Z"
            fill={appearance.secondaryColor}
          />
          <text
            x="280"
            y="146"
            fill="#f4ead3"
            fontFamily="monospace"
            fontSize="37"
            fontWeight="bold"
          >
            {String(appearance.number).padStart(2, '0')}
          </text>
        </g>
      </svg>
    </div>
  )
}

export function GarageBackdrop({
  appearance,
  interactive,
  theme = 'tournament',
  paused = false,
  reduced = false,
  resetViewKey = 0,
}: GarageBackdropProps) {
  const [visible, setVisible] = useState(!document.hidden)
  useEffect(() => {
    const change = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', change)
    return () => document.removeEventListener('visibilitychange', change)
  }, [])
  return (
    <div
      className={`garage-backdrop${interactive ? ' garage-backdrop--interactive' : ''}`}
      data-testid="garage-backdrop"
      aria-hidden={!interactive}
      aria-label={
        interactive
          ? 'Vista 3D del auto. Arrastra para girar y usa la rueda para acercarte.'
          : undefined
      }
    >
      <GaragePoster appearance={appearance} />
      <Suspense fallback={null}>
        <SceneCanvas
          frameloop={
            !visible || paused || reduced || interactive ? 'demand' : 'always'
          }
          fallback={
            <div className="garage-unavailable">
              Vista previa estática · La personalización sigue disponible
            </div>
          }
        >
          <GarageScene
            appearance={appearance}
            interactive={interactive}
            theme={theme}
            paused={paused || !visible}
            reduced={reduced}
            resetViewKey={resetViewKey}
          />
        </SceneCanvas>
      </Suspense>
    </div>
  )
}
