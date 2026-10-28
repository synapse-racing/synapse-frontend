import type { CSSProperties } from 'react'
import type { VehicleAppearance } from '../domain/appearance.ts'

const palette = [
  ['Naranja', '#ff692f'],
  ['Marfil', '#f4ead3'],
  ['Azul', '#387bef'],
  ['Verde', '#73b98a'],
  ['Rojo', '#d94149'],
  ['Grafito', '#303b44'],
] as const

const fields = [
  ['primaryColor', 'Carrocería'],
  ['secondaryColor', 'Detalles'],
  ['rimColor', 'Llantas'],
] as const

export function ColorPicker({
  draft,
  onChange,
}: {
  draft: VehicleAppearance
  onChange: (value: Partial<VehicleAppearance>) => void
}) {
  return (
    <>
      {fields.map(([field, label]) => (
        <fieldset className="garage-colors" key={field}>
          <legend>{label}</legend>
          <div className="garage-color-row">
            <label
              className="garage-custom-color"
              style={{ '--paint': draft[field] } as CSSProperties}
            >
              <input
                type="color"
                aria-label={`Color de ${label.toLowerCase()}`}
                value={draft[field]}
                onChange={(event) => onChange({ [field]: event.target.value })}
              />
              <span>{draft[field].toUpperCase()}</span>
            </label>
            <div className="garage-swatches">
              {palette.map(([name, color]) => (
                <button
                  type="button"
                  key={color}
                  aria-label={`${label}: ${name}`}
                  aria-pressed={draft[field].toLowerCase() === color}
                  style={{ '--paint': color } as CSSProperties}
                  onClick={() => onChange({ [field]: color })}
                />
              ))}
            </div>
          </div>
        </fieldset>
      ))}
    </>
  )
}
