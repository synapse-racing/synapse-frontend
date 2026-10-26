import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { requestGuestImport } from '../../training/persistence/import-guest-training.ts'
import { useAuth } from '../context/useAuth.ts'

export function ProtectedRoute({
  allowGuest = false,
}: {
  allowGuest?: boolean
}) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return (
      <main className="page">
        <p className="eyebrow">Sincronizando sesión</p>
        <h1>Cargando</h1>
      </main>
    )
  }

  if (auth.status === 'guest') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (auth.status === 'visitor' && !allowGuest) {
    return (
      <main className="page">
        <p className="eyebrow">Torneo multijugador</p>
        <h1>Compite con una cuenta.</h1>
        <p>
          Tu progreso de invitado está en este dispositivo. Crea una cuenta para
          guardarlo y competir con otros jugadores.
        </p>
        <Link
          className="primary-button"
          to="/register"
          onClick={requestGuestImport}
        >
          Crear cuenta y guardar progreso
        </Link>
        <p>
          <Link to="/login" onClick={requestGuestImport}>
            Ya tengo cuenta
          </Link>{' '}
          · <Link to="/dashboard">Volver al Paddock</Link>
        </p>
      </main>
    )
  }

  return <Outlet />
}
