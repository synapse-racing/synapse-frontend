import { lazy, Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MenuStageContext, type MenuTheme } from './menu-stage-context.ts'
import { useGamePreferences, useReducedMotion } from './preferences.ts'
import { useExhibitionAudio } from './useExhibitionAudio.ts'
import './menu-stage.css'
import './guest-access.css'

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
  const [hidden, setHidden] = useState(document.hidden)
  const reduced = useReducedMotion()
  const { preferences } = useGamePreferences()
  const paused = preferences.pauseMenuAnimation
  const audioSpeed = useExhibitionAudio(preferences.sound, paused || hidden)
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
      </div>
    </MenuStageContext>
  )
}
