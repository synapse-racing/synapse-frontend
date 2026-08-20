import { useAuth } from '../features/auth/context/useAuth.ts'
import { Link } from 'react-router-dom'

export function DashboardPage() {
  const auth = useAuth()

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <span className="dashboard__brand">Synapse Racing</span>
        <button className="logout-button" onClick={() => void auth.logout()}>
          Cerrar sesion
        </button>
      </header>

      <section className="dashboard__content">
        <p className="eyebrow">Piloto {auth.user?.username}</p>
        <h1>Elige tu siguiente carrera.</h1>
        <p>La base esta lista. Los modos se habilitaran fase por fase.</p>

        <div className="mode-grid">
          <Link className="mode-card mode-card--active" to="/training/neat">
            <span>NEAT disponible</span>
            <h2>Entrenar</h2>
            <p>Evoluciona una poblacion de autos dentro del laboratorio 3D.</p>
          </Link>
          <Link className="mode-card mode-card--active" to="/multiplayer">
            <span>Salas disponibles</span>
            <h2>Multijugador</h2>
            <p>Crea una sala privada y compite con otros pilotos en tiempo real.</p>
          </Link>
        </div>
      </section>
    </main>
  )
}
