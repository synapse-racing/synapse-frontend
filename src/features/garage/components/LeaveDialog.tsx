import { useEffect, useRef } from 'react'

export function LeaveDialog({
  saving,
  canSave,
  onSaveAndExit,
  onDiscard,
  onStay,
}: {
  saving: boolean
  canSave: boolean
  onSaveAndExit: () => void
  onDiscard: () => void
  onStay: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    return () => previous?.focus()
  }, [])

  return (
    <div className="garage-dialog-backdrop" onClick={onStay}>
      <div
        ref={panel}
        className="garage-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="garage-dialog-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            onStay()
            return
          }
          if (event.key !== 'Tab') return
          const buttons = [
            ...(panel.current?.querySelectorAll<HTMLButtonElement>(
              'button:not(:disabled)',
            ) ?? []),
          ]
          if (!buttons.length) return
          const first = buttons[0]
          const last = buttons[buttons.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }}
      >
        <h2 id="garage-dialog-title">
          {saving ? 'Guardando…' : 'Cambios sin guardar'}
        </h2>
        <p>
          {saving
            ? 'Espera a que termine el guardado.'
            : '¿Quieres guardar tu diseño antes de volver al Paddock?'}
        </p>
        <div className="garage-dialog__actions">
          <button
            type="button"
            className="primary-button"
            disabled={saving || !canSave}
            onClick={onSaveAndExit}
          >
            Guardar y salir
          </button>
          <button type="button" disabled={saving} onClick={onDiscard}>
            Descartar y salir
          </button>
          <button type="button" onClick={onStay}>
            Seguir editando
          </button>
        </div>
      </div>
    </div>
  )
}
