import { useEffect } from 'react'
import './car-actions.css'

interface Props {
  name: string
  status: string
  onFollow: () => void
  onEliminate?: () => void
  canEliminate?: boolean
  onClose: () => void
}

export function CarActions({
  name,
  status,
  onFollow,
  onEliminate,
  canEliminate = false,
  onClose,
}: Props) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]'))
        return
      event.preventDefault()
      event.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', close, true)
    return () => window.removeEventListener('keydown', close, true)
  }, [onClose])
  return (
    <section className="car-actions" aria-label={`Opciones de ${name}`}>
      <header>
        <h3>{name}</h3>
        <button aria-label="Cerrar opciones del auto" onClick={onClose}>
          ×
        </button>
      </header>
      <p role="status">{status}</p>
      <button onClick={onFollow}>
        Seguir auto <span aria-hidden="true">↗</span>
      </button>
      {onEliminate && (
        <button
          className="car-actions__eliminate"
          disabled={!canEliminate}
          onClick={onEliminate}
        >
          Eliminar auto
        </button>
      )}
    </section>
  )
}
