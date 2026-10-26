import { lazy, Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { MenuStageContext, type MenuTheme } from './menu-stage-context.ts'
import { useGamePreferences, useReducedMotion } from './preferences.ts'
import { useExhibitionAudio } from './useExhibitionAudio.ts'
import './menu-stage.css'
import './guest-access.css'
import { useAppearance } from '../../features/garage/context/appearance-context.ts'
import '../../features/garage/garage.css'

const GarageBackdrop = lazy(() =>
  import('../../features/garage/components/GarageBackdrop.tsx').then(
    (module) => ({ default: module.GarageBackdrop }),
  ),
)

const ExhibitionBackdrop = lazy(() =>
  import('./ExhibitionBackdrop.tsx').then((module) => ({
    default: module.ExhibitionBackdrop,
  })),
)

export function MenuStage() {
  const { pathname } = useLocation()
  const authScreen = pathname === '/login' || pathname === '/register'
  const garageScreen = pathname === '/garage'
  const garageBackground = garageScreen || pathname === '/dashboard'
  const { displayAppearance } = useAppearance()
  const [resetViewKey, setResetViewKey] = useState(0)
  const [theme, setTheme] = useState<MenuTheme>('tournament')
  const [requestedTheme, preview] = useState<MenuTheme>('tournament')
  const [hidden, setHidden] = useState(document.hidden)
  const reduced = useReducedMotion()
  const { preferences } = useGamePreferences()
  const paused = preferences.pauseMenuAnimation
  const audioSpeed = useExhibitionAudio(
    preferences.sound && !garageBackground,
    paused || hidden,
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
    <MenuStageContext
      value={{
        preview,
        resetGarageView: () => setResetViewKey((value) => value + 1),
      }}
    >
      <div
        className={`menu-stage menu-stage--${authScreen ? 'auth' : pathname === '/' ? 'title' : garageScreen ? 'garage' : 'paddock'}`}
      >
        <Suspense fallback={null}>
          {garageBackground ? (
            <GarageBackdrop
              appearance={displayAppearance}
              interactive={garageScreen}
              theme={theme}
              paused={paused || hidden}
              reduced={reduced}
              resetViewKey={resetViewKey}
            />
          ) : (
            <ExhibitionBackdrop
              theme={theme}
              calm={authScreen}
              paused={paused}
              reduced={reduced}
              audioSpeed={audioSpeed}
            />
          )}
        </Suspense>
        <div className="menu-stage__shade" />
        <div
          className={`menu-stage__transition${!garageBackground && requestedTheme !== theme ? ' is-switching' : ''}`}
        />
        <div className="menu-stage__screen" key={pathname}>
          <Outlet />
        </div>
      </div>
    </MenuStageContext>
  )
}
