import { lazy, Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MenuStageContext, type MenuTheme } from './menu-stage-context.ts'
import { exhibitionShots } from './exhibition.ts'
import { useGamePreferences, useReducedMotion } from './preferences.ts'
import { useExhibitionAudio } from './useExhibitionAudio.ts'
import './menu-stage.css'

const ExhibitionBackdrop = lazy(() =>
  import('./ExhibitionBackdrop.tsx').then((module) => ({
    default: module.ExhibitionBackdrop,
  })),
)

export function MenuStage() {
  const { pathname } = useLocation()
  const authScreen = pathname === '/login' || pathname === '/register'
  const [theme, setTheme] = useState<MenuTheme>('tournament')
  const [requestedTheme, preview] = useState<MenuTheme>('tournament')
  const [paused, setPaused] = useState(false)
  const [shot, setShot] = useState(0)
  const [hidden, setHidden] = useState(document.hidden)
  const reduced = useReducedMotion()
  const { preferences } = useGamePreferences()
  const audioSpeed = useExhibitionAudio(
    preferences.sound,
    paused || reduced || hidden,
  )
  useEffect(() => {
    const change = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', change)
    return () => document.removeEventListener('visibilitychange', change)
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => setTheme(requestedTheme), 180)
    return () => window.clearTimeout(timer)
  }, [requestedTheme])
  return (
    <MenuStageContext value={{ preview }}>
      <div
        className={`menu-stage menu-stage--${authScreen ? 'auth' : pathname === '/' ? 'title' : 'paddock'}`}
      >
        <Suspense fallback={null}>
          <ExhibitionBackdrop
            theme={theme}
            calm={authScreen}
            paused={paused}
            reduced={reduced}
            onShot={setShot}
            audioSpeed={audioSpeed}
          />
        </Suspense>
        <div className="menu-stage__shade" />
        <div
          className={`menu-stage__transition${requestedTheme !== theme ? ' is-switching' : ''}`}
        />
        <div className="menu-stage__screen" key={pathname}>
          <Outlet />
        </div>
        <aside
          className="exhibition-strip"
          aria-label="Controles de exhibición"
        >
          <span className="exhibition-strip__label">
            <i /> EXHIBICIÓN
          </span>
          <div>
            <strong>
              {theme === 'desert'
                ? 'Desert proving grounds'
                : 'Synapse Grand Prix'}
            </strong>
            <span>
              {reduced
                ? 'Vista estática'
                : paused
                  ? 'En pausa'
                  : exhibitionShots[shot].name}
            </span>
          </div>
          <div className="exhibition-shots" aria-hidden="true">
            {exhibitionShots.map((s, i) => (
              <b key={s.name} className={shot === i ? 'is-active' : ''} />
            ))}
          </div>
          <button
            className="text-button"
            aria-label={paused ? 'Reanudar exhibición' : 'Pausar exhibición'}
            aria-pressed={paused}
            disabled={reduced}
            onClick={() => setPaused(!paused)}
          >
            {paused ? '▶' : 'Ⅱ'}
          </button>
        </aside>
      </div>
    </MenuStageContext>
  )
}
