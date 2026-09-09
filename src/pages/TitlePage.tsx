import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/context/useAuth.ts'
import { GarageBackdrop } from '../shared/game/GarageBackdrop.tsx'
import { GameSettings } from '../shared/game/GameSettings.tsx'
import {
  playMenuSound,
  useGamePreferences,
} from '../shared/game/preferences.ts'
export function TitlePage() {
  const auth = useAuth(),
    navigate = useNavigate()
  const { preferences } = useGamePreferences()
  const destination = auth.status === 'authenticated' ? '/dashboard' : '/login'
  useEffect(() => {
    const enter = (event: KeyboardEvent) => {
      if (
        event.key !== 'Enter' ||
        event.repeat ||
        auth.status === 'loading' ||
        document.querySelector('dialog[open]')
      )
        return
      if ((event.target as HTMLElement).closest('button, input, select, a'))
        return
      playMenuSound(preferences.sound)
      navigate(destination)
    }
    window.addEventListener('keydown', enter)
    return () => window.removeEventListener('keydown', enter)
  }, [auth.status, destination, navigate, preferences.sound])
  return (
    <main className="game-shell title-screen">
      <GarageBackdrop />
      <header className="game-header">
        <span className="wordmark">SYNAPSE / MOTORSPORT</span>
        <GameSettings />
      </header>
      <div className="title-content">
        <p className="eyebrow">Inteligencia al límite.</p>
        <h1>
          SYNAPSE<span>RACING</span>
        </h1>
        <p className="title-tagline">
          Entrena a tu piloto.
          <br />
          Gánate la pista.
        </p>
        <button
          className="enter-button"
          disabled={auth.status === 'loading'}
          onClick={() => {
            playMenuSound(preferences.sound)
            navigate(destination)
          }}
        >
          <kbd>ENTER</kbd>
          {auth.status === 'loading'
            ? 'Preparando el garaje…'
            : 'Presiona Enter para continuar'}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      <footer className="game-footer">
        <span>01 / AUTONOMOUS RACING</span>
        <span>TECLADO · RATÓN · TÁCTIL</span>
      </footer>
    </main>
  )
}
