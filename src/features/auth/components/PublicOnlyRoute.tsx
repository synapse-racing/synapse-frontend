import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth.ts'

export function PublicOnlyRoute() {
  const auth = useAuth()

  if (auth.status === 'loading') {
    return (
      <main className="page">
        <p className="eyebrow">Sincronizando sesion</p>
        <h1>Cargando</h1>
      </main>
    )
  }

  return auth.status === 'authenticated' ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Outlet />
  )
}
