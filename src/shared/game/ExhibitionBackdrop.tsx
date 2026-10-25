import { lazy, Suspense, useEffect, useState } from 'react'
import type { MutableRefObject } from 'react'
import { SceneCanvas } from '../three/SceneCanvas.tsx'
import type { MenuTheme } from './menu-stage-context.ts'

const ExhibitionScene = lazy(() => import('../three/ExhibitionScene.tsx'))

function Poster() {
  return (
    <div className="exhibition-poster">
      <svg
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <path
          d="M-100 780 Q350 330 800 570 T1400 80"
          fill="none"
          stroke="#343b38"
          strokeWidth="165"
        />
        <path
          d="M-100 780 Q350 330 800 570 T1400 80"
          fill="none"
          stroke="#e3cfa0"
          strokeWidth="2"
          strokeDasharray="16 22"
        />
        <g transform="translate(850 540) rotate(20)">
          <rect x="-22" y="-40" width="44" height="80" rx="10" fill="#ff713c" />
          <rect x="-15" y="-15" width="30" height="24" fill="#172329" />
        </g>
      </svg>
    </div>
  )
}

export function ExhibitionBackdrop({
  theme,
  calm,
  paused,
  reduced,
  audioSpeed,
}: {
  theme: MenuTheme
  calm: boolean
  paused: boolean
  reduced: boolean
  audioSpeed: MutableRefObject<number>
}) {
  const [visible, setVisible] = useState(!document.hidden)
  useEffect(() => {
    const change = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', change)
    return () => document.removeEventListener('visibilitychange', change)
  }, [])
  return (
    <div className="exhibition-backdrop" aria-hidden="true">
      <Poster />
      <Suspense fallback={null}>
        <SceneCanvas
          frameloop={paused || !visible ? 'demand' : 'always'}
          fallback={
            <div className="exhibition-unavailable">
              Exhibición en pausa · vista estática
            </div>
          }
        >
          <ExhibitionScene
            theme={theme}
            calm={calm}
            paused={paused}
            reduced={reduced}
            visible={visible}
            audioSpeed={audioSpeed}
          />
        </SceneCanvas>
      </Suspense>
    </div>
  )
}
