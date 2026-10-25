import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth.ts'

export function PublicOnlyRoute() {
  const auth = useAuth()

  return auth.status === 'authenticated' ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Outlet />
  )
}
