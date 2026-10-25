import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth.ts'
import { useMenuStage } from '../shared/game/menu-stage-context.ts'
import { GameSettings } from '../shared/game/GameSettings.tsx'
import { GuestProgressImport } from '../features/training/components/GuestProgressImport.tsx'
import { requestGuestImport } from '../features/training/persistence/import-guest-training.ts'
import {
  playMenuSound,
  useGamePreferences,
} from '../shared/game/preferences.ts'

export function DashboardPage() {
  const auth = useAuth()
  const guest = auth.status === 'visitor'
  const { preview } = useMenuStage()
  const menu = useRef<HTMLElement>(null)
  const { preferences } = useGamePreferences()
  return (
    <main className="game-shell dashboard">
      <header className="game-header">
        <Link className="wordmark" to="/">
          SYNAPSE / RACING
        </Link>
        <div className="header-actions">
          <GameSettings />
          <button className="text-button" onClick={() => void auth.logout()}>
            {guest ? 'Salir del modo invitado' : 'Cerrar sesión'}
          </button>
        </div>
      </header>
      <section className="paddock-content">
        <p className="eyebrow">
          Paddock / {guest ? 'Piloto invitado' : auth.user?.username}
        </p>
        {guest ? (
          <section className="guest-progress" aria-label="Modo invitado">
            <p>Tu progreso se guarda en este dispositivo.</p>
            <Link
              className="guest-save-link"
              to="/register"
              onClick={requestGuestImport}
            >
              Crear cuenta y guardar progreso ↗
            </Link>
            <Link to="/login" onClick={requestGuestImport}>
              Ya tengo cuenta
            </Link>
          </section>
        ) : (
          <GuestProgressImport />
        )}
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
          <Link
            to="/training"
            onFocus={() => preview('desert')}
            onMouseEnter={() => preview('desert')}
            onClick={() => playMenuSound(preferences.sound)}
          >
            <span className="menu-index">01</span>
            <div>
              <h2>ENTRENAMIENTO</h2>
              <p>Tu escudería. Tu próxima generación.</p>
            </div>
            <span className="menu-arrow">↗</span>
          </Link>
          <Link
            to="/multiplayer"
            onFocus={() => preview('tournament')}
            onMouseEnter={() => preview('tournament')}
            onClick={() => playMenuSound(preferences.sound)}
          >
            <span className="menu-index">02</span>
            <div>
              <h2>MULTIJUGADOR</h2>
              <p>
                {guest
                  ? 'Requiere cuenta · Guarda tu piloto y compite.'
                  : 'Lleva a tu mejor piloto al torneo.'}
              </p>
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
