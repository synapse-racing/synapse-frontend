import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppearance } from '../context/appearance-context.ts'
import {
  defaultAppearance,
  vehicleCatalog,
  type VehicleAppearance,
} from '../domain/appearance.ts'
import { CarSilhouette } from '../components/CarSilhouette.tsx'
import { useMenuStage } from '../../../shared/game/menu-stage-context.ts'

const palette = [
  ['Naranja', '#ff692f'],
  ['Marfil', '#f4ead3'],
  ['Azul', '#387bef'],
  ['Verde', '#73b98a'],
  ['Rojo', '#d94149'],
  ['Grafito', '#303b44'],
] as const
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

export function GaragePage() {
  const garage = useAppearance()
  if (garage.loading)
    return (
      <main className="garage-loading">
        <p className="eyebrow">Tu escudería / Garaje</p>
        <h1>Preparando tu auto.</h1>
      </main>
    )
  if (garage.loadError)
    return (
      <main className="garage-loading">
        <h1>Tu box te espera.</h1>
        <p role="alert">No se pudo cargar el auto de tu cuenta.</p>
        <button onClick={garage.reload}>Reintentar</button>
        <Link to="/dashboard">Volver al Paddock</Link>
      </main>
    )
  return <GarageEditor key={garage.owner} />
}

function GarageEditor() {
  const garage = useAppearance()
  const preview = garage.preview
  const { resetGarageView } = useMenuStage()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<VehicleAppearance>(garage.appearance)
  const [numberText, setNumberText] = useState(String(garage.appearance.number))
  const [tab, setTab] = useState<'model' | 'paint' | 'identity'>('model')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const validNumber =
    /^\d{1,2}$/.test(numberText) &&
    Number(numberText) >= 1 &&
    Number(numberText) <= 99
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(garage.appearance) || !validNumber
  const currentModel = vehicleCatalog.find(
    (model) => model.id === draft.modelId,
  )!
  const guestDesign =
    !garage.localOnly &&
    garage.guestAppearance &&
    JSON.stringify(garage.guestAppearance) !== JSON.stringify(garage.appearance)
      ? garage.guestAppearance
      : null

  useEffect(() => {
    preview(draft)
    return () => preview(null)
  }, [draft, preview])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function update(value: Partial<VehicleAppearance>) {
    setDraft((current) => ({ ...current, ...value }))
    setMessage('')
  }
  function loadDesign(value: VehicleAppearance) {
    setDraft({ ...value })
    setNumberText(String(value.number))
    setMessage('')
  }
  async function apply(event: FormEvent) {
    event.preventDefault()
    if (!validNumber || garage.saving) return
    setError(false)
    setMessage('')
    try {
      await garage.save(draft)
      setMessage(
        garage.localOnly
          ? 'Diseño equipado y guardado en este navegador.'
          : 'Diseño equipado y guardado en tu cuenta.',
      )
    } catch (cause) {
      setError(true)
      setMessage(
        cause instanceof Error
          ? cause.message
          : 'No se pudo guardar. Puedes reintentarlo sin perder tu diseño.',
      )
    }
  }
  return (
    <main className="garage-editor">
      <header className="garage-header">
        <Link
          to="/dashboard"
          onClick={(event) => {
            if (dirty || garage.saving) {
              event.preventDefault()
              setLeaving(true)
            }
          }}
        >
          ← Paddock
        </Link>
        <span>
          SYNAPSE <b>/</b> MOTOR WORKS
        </span>
        <span className="garage-header__bay">BOX 07</span>
      </header>
      <form
        className="garage-workbench"
        onSubmit={apply}
        aria-label="Personalización del auto"
      >
        <p className="eyebrow">Tu auto. Tu firma.</p>
        <h1>
          HECHO{' '}
          <br />
          <em>PARA TI.</em>
        </h1>
        <div
          className="garage-tabs"
          role="tablist"
          aria-label="Personalización"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
            event.preventDefault()
            const tabs = ['model', 'paint', 'identity'] as const
            const next =
              (tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3
            setTab(tabs[next])
            document.getElementById(`garage-tab-${tabs[next]}`)?.focus()
          }}
        >
          {(
            [
              ['model', '01 / Modelo'],
              ['paint', '02 / Pintura'],
              ['identity', '03 / Identidad'],
            ] as const
          ).map(([id, title]) => (
            <button
              type="button"
              key={id}
              id={`garage-tab-${id}`}
              role="tab"
              aria-selected={tab === id}
              aria-controls={`garage-panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
            >
              {title}
            </button>
          ))}
        </div>
        <section
          className="garage-tab-content"
          role="tabpanel"
          id={`garage-panel-${tab}`}
          aria-labelledby={`garage-tab-${tab}`}
        >
          {tab === 'model' && (
            <>
              <div
                className="garage-model-list"
                aria-label="Modelos disponibles"
              >
                {vehicleCatalog.map((model, index) => (
                  <button
                    type="button"
                    key={model.id}
                    aria-pressed={draft.modelId === model.id}
                    onClick={() => update({ modelId: model.id })}
                  >
                    <span className="garage-model-index">0{index + 1}</span>
                    <CarSilhouette
                      modelId={model.id}
                      color={
                        draft.modelId === model.id
                          ? draft.primaryColor
                          : '#9ea9a5'
                      }
                    />
                    <span>
                      <strong>{model.name}</strong>
                      <small>{model.category}</small>
                    </span>
                    <span aria-hidden="true">
                      {draft.modelId === model.id ? '●' : '↗'}
                    </span>
                  </button>
                ))}
              </div>
              <p className="garage-description">{currentModel.description}</p>
              <p className="garage-fair-play">
                Mismo rendimiento. Tu propia identidad.
              </p>
            </>
          )}
          {tab === 'paint' && (
            <>
              {(
                [
                  ['primaryColor', 'Carrocería'],
                  ['secondaryColor', 'Detalles'],
                  ['rimColor', 'Llantas'],
                ] as const
              ).map(([field, label]) => (
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
                        onChange={(event) =>
                          update({ [field]: event.target.value })
                        }
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
                          onClick={() => update({ [field]: color })}
                        />
                      ))}
                    </div>
                  </div>
                </fieldset>
              ))}
              <fieldset className="garage-choice">
                <legend>Acabado</legend>
                <div>
                  {finishes.map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={draft.finish === value}
                      onClick={() => update({ finish: value })}
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
                      onClick={() => update({ livery: value })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {tab === 'identity' && (
            <div className="garage-identity">
              <label htmlFor="garage-number">Tu número en la parrilla</label>
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
                  onChange={(event) => {
                    const value = event.target.value
                    setNumberText(value)
                    if (/^\d{1,2}$/.test(value) && +value >= 1)
                      update({ number: +value })
                  }}
                />
              </div>
              <p id="garage-number-hint">
                Elige un número del 1 al 99. Aparecerá en tu auto.
              </p>
              <div
                className="garage-number-preview"
                style={{ '--paint': draft.primaryColor } as CSSProperties}
              >
                <span>SYNAPSE RACING</span>
                <strong>
                  {validNumber ? numberText.padStart(2, '0') : '—'}
                </strong>
                <small>{currentModel.name}</small>
              </div>
            </div>
          )}
        </section>
        {guestDesign && (
          <div className="garage-import">
            <p>Hay un diseño de invitado en este navegador.</p>
            <button type="button" onClick={() => loadDesign(guestDesign)}>
              Usar diseño de invitado
            </button>
          </div>
        )}
        <div className="garage-save-status" aria-live="polite">
          {message ? (
            <p
              role={error ? 'alert' : 'status'}
              className={error ? 'is-error' : 'is-saved'}
            >
              {message}
            </p>
          ) : (
            <p>
              {garage.saving
                ? 'Guardando tu diseño…'
                : dirty
                  ? 'Vista previa · cambios por aplicar'
                  : garage.localOnly
                    ? 'Guardado en este navegador'
                    : 'Guardado en tu cuenta'}
            </p>
          )}
        </div>
        <div className="garage-actions">
          <button
            type="submit"
            className="primary-button"
            disabled={garage.saving || !validNumber || !dirty}
          >
            {garage.saving ? 'Guardando…' : 'Aplicar cambios ↗'}
          </button>
          <button
            type="button"
            disabled={garage.saving}
            onClick={() => navigate('/dashboard')}
          >
            Cancelar
          </button>
        </div>
        <button
          className="garage-reset"
          type="button"
          disabled={garage.saving}
          onClick={() => loadDesign(defaultAppearance)}
        >
          Restablecer diseño
        </button>
        {leaving && (
          <div className="garage-leave" role="alert">
            <p>
              {garage.saving
                ? 'Espera a que termine el guardado.'
                : 'Tienes cambios sin aplicar.'}
            </p>
            <button type="button" onClick={() => setLeaving(false)}>
              Seguir editando
            </button>
            <button
              type="button"
              disabled={garage.saving}
              onClick={() => navigate('/dashboard')}
            >
              Descartar y salir
            </button>
          </div>
        )}
      </form>
      <aside className="garage-car-label" aria-label="Auto en exhibición">
        <span>
          {currentModel.category} / #{String(draft.number).padStart(2, '0')}
        </span>
        <h2>{currentModel.name}</h2>
        <p>Arrastra para girar · rueda para acercar</p>
        <button onClick={resetGarageView}>Restablecer cámara</button>
      </aside>
    </main>
  )
}
