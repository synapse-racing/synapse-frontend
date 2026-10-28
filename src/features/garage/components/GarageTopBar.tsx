import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error' | 'success'

export function GarageTopBar({
  onBack,
  state,
  message,
}: {
  onBack: (event: MouseEvent<HTMLAnchorElement>) => void
  state: SaveState
  message: string
}) {
  return (
    <header className="garage-header">
      <Link to="/dashboard" className="garage-back" onClick={onBack}>
        ← Paddock
      </Link>
      <span className="garage-header__brand">
        SYNAPSE <b>/</b> MOTOR WORKS
      </span>
      <div className="garage-save-status" aria-live="polite">
        {state === 'error' || state === 'success' ? (
          <p
            role={state === 'error' ? 'alert' : 'status'}
            className={`garage-chip is-${state}`}
          >
            {message}
          </p>
        ) : (
          <p className={`garage-chip is-${state}`}>{message}</p>
        )}
      </div>
    </header>
  )
}
