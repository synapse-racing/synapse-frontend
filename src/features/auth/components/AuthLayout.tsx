import { Link } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { GameSettings } from '../../../shared/game/GameSettings.tsx'

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="auth-intro__header"><Link className="auth-brand" to="/">← SYNAPSE / RACING</Link><GameSettings /></div>
        <div>
          <p className="eyebrow">Acceso al paddock</p>
          <h1>TU LUGAR{' '}<br />EN LA{' '}<br /><em>PARRILLA.</em></h1>
          <p>
            Cada generación, más cerca de la vuelta perfecta.
          </p>
        </div>
      </section>
      <section className="auth-form-panel">{children}</section>
    </main>
  )
}
