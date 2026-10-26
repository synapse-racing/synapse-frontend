import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppearance } from '../context/appearance-context.ts'
import {
  defaultAppearance,
  vehicleCatalog,
  type VehicleAppearance,
} from '../domain/appearance.ts'
import { useMenuStage } from '../../../shared/game/menu-stage-context.ts'
import { ModelPicker } from '../components/ModelPicker.tsx'
import { ColorPicker } from '../components/ColorPicker.tsx'
import { FinishPicker } from '../components/FinishPicker.tsx'
import { NumberPicker } from '../components/NumberPicker.tsx'
import { GarageTopBar, type SaveState } from '../components/GarageTopBar.tsx'
import { GarageActionBar } from '../components/GarageActionBar.tsx'
import { LeaveDialog } from '../components/LeaveDialog.tsx'

const tabs = [
  ['model', '01 / Modelo'],
  ['colors', '02 / Colores'],
  ['finish', '03 / Acabado'],
  ['number', '04 / Número'],
] as const
type Tab = (typeof tabs)[number][0]

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
  const [tab, setTab] = useState<Tab>('model')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const validNumber =
    /^\d{1,2}$/.test(numberText) &&
    Number(numberText) >= 1 &&
    Number(numberText) <= 99
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(garage.appearance) || !validNumber
  const canSave = validNumber && !garage.saving
  const currentModel = vehicleCatalog.find(
    (model) => model.id === draft.modelId,
  )!
  const guestDesign =
    !garage.localOnly &&
    garage.guestAppearance &&
    JSON.stringify(garage.guestAppearance) !== JSON.stringify(garage.appearance)
      ? garage.guestAppearance
      : null

  const saveState: SaveState = message
    ? error
      ? 'error'
      : 'success'
    : garage.saving
      ? 'saving'
      : dirty
        ? 'dirty'
        : 'saved'
  const statusText =
    message ||
    (garage.saving
      ? 'Guardando tu diseño…'
      : dirty
        ? 'Cambios sin guardar'
        : garage.localOnly
          ? 'Guardado en este navegador'
          : 'Guardado en tu cuenta')

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
  function exit() {
    navigate('/dashboard')
  }
  function requestExit() {
    if (dirty || garage.saving) setLeaving(true)
    else exit()
  }
  async function persist() {
    if (!canSave) return false
    setError(false)
    setMessage('')
    try {
      await garage.save(draft)
      setMessage(
        garage.localOnly
          ? 'Diseño equipado y guardado en este navegador.'
          : 'Diseño equipado y guardado en tu cuenta.',
      )
      return true
    } catch (cause) {
      setError(true)
      setMessage(
        cause instanceof Error
          ? cause.message
          : 'No se pudo guardar. Puedes reintentarlo sin perder tu diseño.',
      )
      return false
    }
  }
  async function saveAndExit() {
    setLeaving(false)
    if (await persist()) exit()
  }
  function apply(event: FormEvent) {
    event.preventDefault()
    void persist()
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (leaving) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (dirty) void persist()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        requestExit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <main className="garage-editor">
      <GarageTopBar
        onBack={(event) => {
          if (dirty || garage.saving) {
            event.preventDefault()
            setLeaving(true)
          }
        }}
        state={saveState}
        message={statusText}
      />
      <form
        className="garage-workbench"
        onSubmit={apply}
        aria-label="Personalización del auto"
      >
        <div className="garage-title">
          <p className="eyebrow">Tu auto. Tu firma.</p>
          <h1>
            Hecho <em>para ti.</em>
          </h1>
        </div>
        <div
          className="garage-tabs"
          role="tablist"
          aria-label="Personalización"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
            event.preventDefault()
            const ids = tabs.map(([id]) => id)
            const step = event.key === 'ArrowRight' ? 1 : ids.length - 1
            const next = ids[(ids.indexOf(tab) + step) % ids.length]
            setTab(next)
            document.getElementById(`garage-tab-${next}`)?.focus()
          }}
        >
          {tabs.map(([id, title]) => (
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
          {tab === 'model' && <ModelPicker draft={draft} onChange={update} />}
          {tab === 'colors' && <ColorPicker draft={draft} onChange={update} />}
          {tab === 'finish' && <FinishPicker draft={draft} onChange={update} />}
          {tab === 'number' && (
            <NumberPicker
              draft={draft}
              modelName={currentModel.name}
              numberText={numberText}
              validNumber={validNumber}
              onNumberText={(value) => {
                setNumberText(value)
                if (/^\d{1,2}$/.test(value) && +value >= 1)
                  update({ number: +value })
              }}
            />
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
        <GarageActionBar
          dirty={dirty}
          saving={garage.saving}
          canSave={canSave}
          onReset={() => loadDesign(defaultAppearance)}
          onDiscard={() => loadDesign(garage.appearance)}
          onSaveAndExit={() => void saveAndExit()}
          onExit={exit}
        />
      </form>
      <aside className="garage-car-label" aria-label="Auto en exhibición">
        <span>
          {currentModel.category} / #{String(draft.number).padStart(2, '0')}
        </span>
        <h2>{currentModel.name}</h2>
        <p>Arrastra para girar · rueda para acercar</p>
        <button onClick={resetGarageView}>Restablecer cámara</button>
      </aside>
      {leaving && (
        <LeaveDialog
          saving={garage.saving}
          canSave={canSave}
          onSaveAndExit={() => void saveAndExit()}
          onDiscard={exit}
          onStay={() => setLeaving(false)}
        />
      )}
    </main>
  )
}
