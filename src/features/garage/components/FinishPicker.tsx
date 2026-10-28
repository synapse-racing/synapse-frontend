import type { VehicleAppearance } from '../domain/appearance.ts'

const finishes = [
  ['matte', 'Mate'],
  ['satin', 'Satinado'],
  ['metallic', 'Metálico'],
] as const
const liveries = [
  ['solid', 'Liso'],
  ['stripe', 'Franjas'],
  ['split', 'Bicolor'],
] as const

export function FinishPicker({
  draft,
  onChange,
}: {
  draft: VehicleAppearance
  onChange: (value: Partial<VehicleAppearance>) => void
}) {
  return (
    <>
      <fieldset className="garage-choice">
        <legend>Acabado</legend>
        <div>
          {finishes.map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={draft.finish === value}
              onClick={() => onChange({ finish: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="garage-choice">
        <legend>Diseño</legend>
        <div>
          {liveries.map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={draft.livery === value}
              onClick={() => onChange({ livery: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
    </>
  )
}
