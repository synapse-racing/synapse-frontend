import { Link } from 'react-router-dom'
import type { PropsWithChildren } from 'react'

export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <Link className="auth-brand" to="/">
          Synapse Racing
        </Link>
        <div>
          <p className="eyebrow">Evolucion en movimiento</p>
          <h1>Entrena. Compite. Evoluciona.</h1>
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
