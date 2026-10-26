import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth.ts'
import { useMenuStage } from '../shared/game/menu-stage-context.ts'
import { GameSettings } from '../shared/game/GameSettings.tsx'
import { GuestProgressImport } from '../features/training/components/GuestProgressImport.tsx'
import { requestGuestImport } from '../features/training/persistence/import-guest-training.ts'
import { useAppearance } from '../features/garage/context/appearance-context.ts'
import { vehicleCatalog } from '../features/garage/domain/appearance.ts'
import {
  playMenuSound,
  useGamePreferences,
} from '../shared/game/preferences.ts'

export function DashboardPage() {
  const auth = useAuth()
  const guest = auth.status === 'visitor'
  const { appearance, guestAppearance, loading, loadError } = useAppearance()
  const car = vehicleCatalog.find((model) => model.id === appearance.modelId)!
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
          A LA <br />
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
          <Link to="/garage" onClick={() => playMenuSound(preferences.sound)}>
            <span className="menu-index">03</span>
            <div>
              <h2>GARAJE</h2>
              <p>Elige tu auto. Deja tu firma.</p>
            </div>
            <span className="menu-arrow">↗</span>
          </Link>
        </nav>
        {!guest && guestAppearance && (
          <Link className="paddock-guest-design" to="/garage">
            Tu diseño de invitado te espera en el garaje ↗
          </Link>
        )}
      </section>
      <Link
        className="paddock-equipped"
        to="/garage"
        aria-label="Personalizar auto equipado"
      >
        <span>
          {loading
            ? 'Preparando tu auto'
            : loadError
              ? 'Abre el garaje para cargar tu auto'
              : 'Tu auto / listo para la pista'}
        </span>
        <strong>
          {car.name} <b>#{String(appearance.number).padStart(2, '0')}</b>
        </strong>
        <small>PERSONALIZAR ↗</small>
      </Link>
      <footer className="game-footer">
        <span>
          <kbd>↑ ↓</kbd> ELEGIR <kbd>ENTER</kbd> CONFIRMAR
        </span>
        <span>NEAT / RACE LAB</span>
      </footer>
    </main>
  )
}
