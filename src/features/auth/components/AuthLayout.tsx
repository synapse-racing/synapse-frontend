import { Link } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { GarageBackdrop } from '../../../shared/game/GarageBackdrop.tsx'

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="auth-shell">
      <GarageBackdrop />
      <section className="auth-intro">
        <Link className="auth-brand" to="/">
          Synapse Racing
        </Link>
        <div>
          <p className="eyebrow">Acceso al paddock</p>
          <h1>TODO EMPIEZA EN EL GARAJE.</h1>
          <p>
            Desarrolla pilotos autonomos con NEAT y lleva tus resultados a la
            pista contra otros jugadores.
          </p>
        </div>
      </section>
      <section className="auth-form-panel">{children}</section>
    </main>
  )
}
