import type { CSSProperties } from 'react'
import type { VehicleAppearance } from '../domain/appearance.ts'

export function NumberPicker({
  draft,
  modelName,
  numberText,
  validNumber,
  onNumberText,
}: {
  draft: VehicleAppearance
  modelName: string
  numberText: string
  validNumber: boolean
  onNumberText: (value: string) => void
}) {
  return (
    <div className="garage-identity">
      <label htmlFor="garage-number">Tu número en la parrilla</label>
      <div className="garage-number-row">
        <div className="garage-number-input">
          <span>#</span>
          <input
            id="garage-number"
            type="number"
            min="1"
            max="99"
            step="1"
            value={numberText}
            aria-invalid={!validNumber}
            aria-describedby="garage-number-hint"
            onChange={(event) => onNumberText(event.target.value)}
          />
        </div>
        <div
          className="garage-number-preview"
          style={{ '--paint': draft.primaryColor } as CSSProperties}
        >
          <span>SYNAPSE RACING</span>
          <strong>{validNumber ? numberText.padStart(2, '0') : '—'}</strong>
          <small>{modelName}</small>
        </div>
      </div>
      <p id="garage-number-hint">
        Elige un número del 1 al 99. Aparecerá en tu auto.
      </p>
    </div>
  )
}
