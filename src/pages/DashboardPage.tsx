import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth.ts'
import { GarageBackdrop } from '../shared/game/GarageBackdrop.tsx'
import { GameSettings } from '../shared/game/GameSettings.tsx'
import {
  playMenuSound,
  useGamePreferences,
} from '../shared/game/preferences.ts'

export function DashboardPage() {
  const auth = useAuth()
  const menu = useRef<HTMLElement>(null)
  const { preferences } = useGamePreferences()
  return (
    <main className="game-shell dashboard">
      <GarageBackdrop />
      <header className="game-header">
        <Link className="wordmark" to="/">
          SYNAPSE / RACING
        </Link>
        <div className="header-actions">
          <GameSettings />
          <button className="text-button" onClick={() => void auth.logout()}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <section className="paddock-content">
        <p className="eyebrow">Paddock / {auth.user?.username}</p>
        <h1>
          A LA
          <br />
          PISTA.
        </h1>
        <nav
          className="game-menu"
          ref={menu}
          aria-label="Modos de juego"
          onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
            event.preventDefault()
            const links = Array.from(menu.current?.querySelectorAll('a') ?? [])
            const index = links.indexOf(
              document.activeElement as HTMLAnchorElement,
            )
            links[
              (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) %
                links.length
            ]?.focus()
          }}
        >
          <Link to="/training" onClick={() => playMenuSound(preferences.sound)}>
            <span className="menu-index">01</span>
            <div>
              <h2>ENTRENAMIENTO</h2>
              <p>Tu escudería. Tu próxima generación.</p>
            </div>
            <span className="menu-arrow">↗</span>
          </Link>
          <Link
            to="/multiplayer"
            onClick={() => playMenuSound(preferences.sound)}
          >
            <span className="menu-index">02</span>
            <div>
              <h2>MULTIJUGADOR</h2>
              <p>Lleva a tu mejor piloto al torneo.</p>
            </div>
            <span className="menu-arrow">↗</span>
          </Link>
        </nav>
      </section>
      <footer className="game-footer">
        <span>
          <kbd>↑ ↓</kbd> ELEGIR <kbd>ENTER</kbd> CONFIRMAR
        </span>
        <span>NEAT / RACE LAB</span>
      </footer>
    </main>
  )
}
