import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './features/auth/pages/LoginPage.tsx'
import { RegisterPage } from './features/auth/pages/RegisterPage.tsx'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute.tsx'
import { PublicOnlyRoute } from './features/auth/components/PublicOnlyRoute.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'

const NeatTrainingPage = lazy(() =>
  import('./features/training/pages/NeatTrainingPage.tsx').then((module) => ({
    default: module.NeatTrainingPage,
  })),
)

const MultiplayerPage = lazy(() =>
  import('./features/multiplayer/pages/MultiplayerPage.tsx').then((module) => ({
    default: module.MultiplayerPage,
  })),
)

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/training"
          element={
            <Suspense
              fallback={
                <main className="page">
                  <p className="eyebrow">Construyendo poblacion</p>
                  <h1>Cargando NEAT</h1>
                </main>
              }
            >
              <NeatTrainingPage />
            </Suspense>
          }
        />
        <Route path="/training/neat" element={<Navigate to="/training" replace />} />
        <Route
          path="/multiplayer"
          element={
            <Suspense
              fallback={
                <main className="page">
                  <p className="eyebrow">Abriendo socket</p>
                  <h1>Conectando pilotos</h1>
                </main>
              }
            >
              <MultiplayerPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
