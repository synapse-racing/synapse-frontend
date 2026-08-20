import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="page">
      <p className="eyebrow">Error 404</p>
      <h1>Ruta no encontrada</h1>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </main>
  )
}
