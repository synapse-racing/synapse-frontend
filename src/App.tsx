import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './features/auth/pages/LoginPage.tsx'
import { RegisterPage } from './features/auth/pages/RegisterPage.tsx'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute.tsx'
import { PublicOnlyRoute } from './features/auth/components/PublicOnlyRoute.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { NotFoundPage } from './pages/NotFoundPage.tsx'
import { TitlePage } from './pages/TitlePage.tsx'
import { GamePreferences } from './shared/game/preferences.tsx'

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
    <GamePreferences><Routes>
      <Route path="/" element={<TitlePage />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/training"
          element={
            <Suspense
              fallback={
                <main className="page">
                  <p className="eyebrow">Campo de pruebas</p>
                  <h1>Preparando la pista</h1>
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
                  <p className="eyebrow">Torneo / Multijugador</p>
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
    </Routes></GamePreferences>
  )
}

export default App
