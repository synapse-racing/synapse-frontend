import { vehicleCatalog, type VehicleAppearance } from '../domain/appearance.ts'
import { CarSilhouette } from './CarSilhouette.tsx'

export function ModelPicker({
  draft,
  onChange,
}: {
  draft: VehicleAppearance
  onChange: (value: Partial<VehicleAppearance>) => void
}) {
  const currentModel = vehicleCatalog.find(
    (model) => model.id === draft.modelId,
  )!
  return (
    <>
      <div className="garage-model-list" aria-label="Modelos disponibles">
        {vehicleCatalog.map((model, index) => {
          const selected = draft.modelId === model.id
          return (
            <button
              type="button"
              key={model.id}
              aria-pressed={selected}
              onClick={() => onChange({ modelId: model.id })}
            >
              <span className="garage-model-index">0{index + 1}</span>
              <CarSilhouette
                modelId={model.id}
                color={selected ? draft.primaryColor : '#9ea9a5'}
              />
              <strong>{model.name}</strong>
              <small>{model.category}</small>
            </button>
          )
        })}
      </div>
      <p className="garage-description">{currentModel.description}</p>
      <p className="garage-fair-play">Mismo rendimiento. Tu propia identidad.</p>
    </>
  )
}
