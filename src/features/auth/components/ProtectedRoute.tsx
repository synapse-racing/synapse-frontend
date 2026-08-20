import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth.ts'

export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return (
      <main className="page">
        <p className="eyebrow">Sincronizando sesion</p>
        <h1>Cargando</h1>
      </main>
    )
  }

  if (auth.status === 'guest') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
