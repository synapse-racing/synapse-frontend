import { useEffect, useRef, useState } from 'react'
import { useGamePreferences } from './preferences.ts'
export function GameSettings() {
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const { preferences, update } = useGamePreferences()
  useEffect(() => {
    if (open) dialog.current?.showModal()
    else if (dialog.current?.open) dialog.current.close()
  }, [open])
  return (
    <>
      <button className="text-button" onClick={() => setOpen(true)}>
        Ajustes
      </button>
      <dialog
        ref={dialog}
        className="game-dialog"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <p className="eyebrow">Configuración del juego</p>
        <h2>A tu medida.</h2>
        <label className="field">
          Calidad gráfica
          <select
            value={preferences.quality}
            onChange={(e) =>
              update({ quality: e.target.value as 'low' | 'high' })
            }
          >
            <option value="high">Alta · sombras y escenario completo</option>
            <option value="low">Rendimiento · escenario simplificado</option>
          </select>
        </label>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={preferences.sound}
            onChange={(e) => update({ sound: e.target.checked })}
          />{' '}
          Sonidos del menú
        </label>
        <label className="setting-toggle">
          <input
            type="checkbox"
            checked={preferences.reducedMotion}
            onChange={(e) => update({ reducedMotion: e.target.checked })}
          />{' '}
          Reducir movimiento de cámara
        </label>
        <button className="primary-button" onClick={() => setOpen(false)}>
          Volver al juego
        </button>
      </dialog>
    </>
  )
}
