export function GarageActionBar({
  dirty,
  saving,
  canSave,
  onReset,
  onDiscard,
  onSaveAndExit,
  onExit,
}: {
  dirty: boolean
  saving: boolean
  canSave: boolean
  onReset: () => void
  onDiscard: () => void
  onSaveAndExit: () => void
  onExit: () => void
}) {
  return (
    <div className="garage-action-bar">
      <button
        type="button"
        className="garage-icon-button"
        disabled={saving}
        onClick={onReset}
        aria-label="Restablecer diseño"
        title="Restablecer diseño por defecto"
      >
        ↺
      </button>
      {dirty || saving ? (
        <>
          <button type="button" disabled={saving} onClick={onDiscard}>
            Descartar
          </button>
          <button type="submit" disabled={saving || !canSave}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saving || !canSave}
            onClick={onSaveAndExit}
          >
            Guardar y volver
          </button>
        </>
      ) : (
        <button type="button" className="primary-button" onClick={onExit}>
          ← Volver al Paddock
        </button>
      )}
    </div>
  )
}
