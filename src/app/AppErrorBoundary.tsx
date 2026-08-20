import { Component, type ErrorInfo, type PropsWithChildren } from 'react'

interface ErrorBoundaryState {
  failed: boolean
}

export class AppErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unrecoverable render error', error, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-error">
          <p className="eyebrow">Error de aplicacion</p>
          <h1>No pudimos renderizar esta pantalla.</h1>
          <p>
            La sesion y los entrenamientos guardados permanecen seguros. Puedes
            recargar o volver al inicio.
          </p>
          <div>
            <button onClick={() => window.location.reload()}>Recargar</button>
            <button onClick={() => window.location.assign('/')}>Ir al inicio</button>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}
