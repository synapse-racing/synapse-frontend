import { SceneCanvas } from '../../../shared/three/SceneCanvas.tsx'
import type { RaceCameraMode } from '../../../shared/three/RaceCamera.tsx'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ApiError } from '../../../shared/api/http.ts'
import { useAuth } from '../../auth/context/useAuth.ts'
import * as trainingApi from '../api/training.api.ts'
import * as guestTraining from '../persistence/guest-training.ts'
import type { SaveCheckpointInput, TrainingRun } from '../api/training.api.ts'
import {
  NeatTrainingHud,
  type PersistenceStatus,
  type TrainingStatus,
} from '../components/NeatTrainingHud.tsx'
import type { SimulationSpeed } from '../../../shared/game/SimulationSpeedControl.tsx'
import { CarActions } from '../../../shared/game/CarActions.tsx'
import type {
  AgentControl,
  AgentFinishReason,
} from '../domain/agent-control.ts'
import { NeatTrainingScene } from '../components/NeatTrainingScene.tsx'
import { TrainingRunSelector } from '../components/TrainingRunSelector.tsx'
import { calculateFitness, type AgentRuntime } from '../domain/fitness.ts'
import {
  advanceTrackProgress,
  initialTrackProgress,
  type TrackProgress,
} from '../domain/progress.ts'
import { generateTrack } from '../domain/track.ts'
import type { Genome } from '../neat/genes.ts'
import { NeatPopulation, type GenerationMetrics } from '../neat/population.ts'

const trainingSeed = 42_170
const neatCarPrefix = 'neat-car:'

interface EvaluationRecord {
  progress: TrackProgress
  reason?: AgentFinishReason
}

function createEvaluationRecords(genomes: Genome[]) {
  return new Map<string, EvaluationRecord>(
    genomes.map((genome) => [
      genome.id,
      { progress: { ...initialTrackProgress } },
    ]),
  )
}

function createInitialMetrics(engine: NeatPopulation): GenerationMetrics {
  return {
    generation: 0,
    bestFitness: 0,
    averageFitness: 0,
    speciesCount: engine.currentSpecies().length,
  }
}

export function NeatTrainingPage() {
  const auth = useAuth()
  const queryClient = useQueryClient()
  const isGuest = auth.status === 'visitor'
  const runsKey = [
    'training-runs',
    isGuest ? 'guest' : (auth.user?.id ?? 'account'),
  ]
  const [engine, setEngine] = useState(() => new NeatPopulation(trainingSeed))
  const [genomes, setGenomes] = useState(() => [...engine.genomes])
  const [status, setStatus] = useState<TrainingStatus>('idle')
  const [alive, setAlive] = useState(engine.config.populationSize)
  const [metrics, setMetrics] = useState(() => createInitialMetrics(engine))
  const [currentBest, setCurrentBest] = useState(0)
  const [cameraMode, setCameraMode] = useState<RaceCameraMode>('overview')
  const [selectedCar, setSelectedCar] = useState(0)
  const [inspectedCar, setInspectedCar] = useState<string | null>(null)
  const [, refreshPanel] = useState(0)
  const [timeScale, setTimeScale] = useState<SimulationSpeed>(1)
  const [showRaycasts, setShowRaycasts] = useState(false)
  const [runId, setRunId] = useState(0)
  const [selectedRun, setSelectedRun] = useState<TrainingRun | null>(null)
  const [selectorBusy, setSelectorBusy] = useState(false)
  const [selectorError, setSelectorError] = useState<string | null>(null)
  const [persistenceStatus, setPersistenceStatus] =
    useState<PersistenceStatus>('idle')
  const recordsRef = useRef(createEvaluationRecords(engine.genomes))
  const fitnessRef = useRef(new Map<string, number>())
  const carControls = useRef(new Map<string, AgentControl>())
  const generationClosing = useRef(false)
  const resumeAfterEvolution = useRef(true)
  const registerCar = useCallback((id: string, control: AgentControl) => {
    carControls.current.set(id, control)
    return () => {
      if (carControls.current.get(id) === control)
        carControls.current.delete(id)
    }
  }, [])
  const pendingSave = useRef<{
    run: TrainingRun
    input: SaveCheckpointInput
  } | null>(null)
  const saveInFlight = useRef(false)
  const activeRunId = useRef<string | null>(null)
  useEffect(
    () => () => {
      activeRunId.current = null
    },
    [],
  )
  const generationStartedAt = useRef(performance.now())

  const runsQuery = useQuery({
    queryKey: runsKey,
    enabled: isGuest || Boolean(auth.accessToken),
    queryFn: () => {
      if (isGuest) return guestTraining.listGuestRuns()
      if (!auth.accessToken) throw new Error('Authentication required')
      return trainingApi.listTrainingRuns(auth.accessToken)
    },
  })

  const running = status === 'running'
  const generationKey = `${runId}-${engine.generation}`
  const activeTrack = useMemo(
    () => generateTrack(engine.config.track),
    [engine.config.track],
  )

  async function withFreshAccess<T>(operation: (token: string) => Promise<T>) {
    if (!auth.accessToken) throw new Error('Authentication required')
    try {
      return await operation(auth.accessToken)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return operation(await auth.renewSession())
      }
      throw error
    }
  }

  function activateTraining(nextEngine: NeatPopulation, run: TrainingRun) {
    activeRunId.current = run.id
    pendingSave.current = null
    generationClosing.current = false
    resumeAfterEvolution.current = true
    carControls.current.clear()
    setInspectedCar(null)
    setSelectedCar(0)
    setEngine(nextEngine)
    setGenomes([...nextEngine.genomes])
    setStatus('idle')
    setAlive(nextEngine.config.populationSize)
    setMetrics({
      generation: Math.max(0, nextEngine.generation - 1),
      bestFitness: run.bestFitness,
      averageFitness: 0,
      speciesCount: nextEngine.currentSpecies().length,
    })
    setCurrentBest(0)
    setRunId((value) => value + 1)
    setSelectedRun(run)
    setPersistenceStatus(
      isGuest || run.currentGeneration > 0 ? 'saved' : 'idle',
    )
    recordsRef.current = createEvaluationRecords(nextEngine.genomes)
    fitnessRef.current = new Map()
    generationStartedAt.current = performance.now()
  }

  async function createRun(name: string, seed: number) {
    setSelectorBusy(true)
    setSelectorError(null)
    try {
      const nextEngine = new NeatPopulation(seed, {
        track: { version: 'grand-prix-v3', seed },
      })
      const run = isGuest
        ? await guestTraining.createGuestRun({
            name,
            seed,
            config: nextEngine.config,
          })
        : await withFreshAccess((token) =>
            trainingApi.createTrainingRun(token, {
              name,
              seed,
              config: nextEngine.config,
            }),
          )
      activateTraining(nextEngine, run)
      await runsQuery.refetch()
    } catch (error) {
      setSelectorError(
        error instanceof Error ? error.message : 'No se pudo crear',
      )
    } finally {
      setSelectorBusy(false)
    }
  }

  async function loadRun(run: TrainingRun) {
    setSelectorBusy(true)
    setSelectorError(null)
    try {
      const checkpoint = isGuest
        ? (await guestTraining.getGuestTraining(run.id)).checkpoint
        : await withFreshAccess((token) =>
            trainingApi.getLatestCheckpoint(token, run.id),
          )
      const nextEngine = checkpoint
        ? NeatPopulation.fromSnapshot(checkpoint.snapshot)
        : new NeatPopulation(run.seed, run.config)
      activateTraining(nextEngine, run)
      await updateRunStatus(run.id, 'PAUSED')
    } catch (error) {
      setSelectorError(
        error instanceof Error ? error.message : 'No se pudo cargar',
      )
    } finally {
      setSelectorBusy(false)
    }
  }

  async function deleteRun(run: TrainingRun) {
    setSelectorBusy(true)
    try {
      if (isGuest) await guestTraining.deleteGuestRun(run.id)
      else
        await withFreshAccess((token) =>
          trainingApi.deleteTrainingRun(token, run.id),
        )
      await runsQuery.refetch()
    } catch (error) {
      setSelectorError(
        error instanceof Error ? error.message : 'No se pudo eliminar',
      )
    } finally {
      setSelectorBusy(false)
    }
  }

  async function persistGeneration(
    run: TrainingRun,
    input: SaveCheckpointInput,
  ) {
    if (saveInFlight.current) return false
    saveInFlight.current = true
    pendingSave.current = { run, input }
    setPersistenceStatus('saving')
    try {
      const updated = isGuest
        ? await guestTraining.saveGuestCheckpoint(run.id, input)
        : await withFreshAccess((token) =>
            trainingApi.saveCheckpoint(token, run.id, input),
          )
      if (activeRunId.current !== run.id) return false
      pendingSave.current = null
      setSelectedRun(updated)
      queryClient.setQueryData<TrainingRun[]>(runsKey, (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)),
      )
      setPersistenceStatus('saved')
      return true
    } catch {
      if (activeRunId.current === run.id) setPersistenceStatus('error')
      return false
    } finally {
      saveInFlight.current = false
    }
  }

  const persistFromEffect = useEffectEvent(persistGeneration)

  function handleCheckpoint(index: number, rigidBodyName: string) {
    if (!rigidBodyName.startsWith(neatCarPrefix)) return
    const genomeId = rigidBodyName.slice(neatCarPrefix.length)
    if (fitnessRef.current.has(genomeId)) return

    const record = recordsRef.current.get(genomeId)
    if (!record) return
    record.progress = advanceTrackProgress(
      record.progress,
      index,
      activeTrack.checkpoints.length,
    )
    if (inspectedCar === genomeId) refreshPanel((value) => value + 1)
  }

  function handleAgentFinish(
    genomeId: string,
    runtime: AgentRuntime,
    reason: AgentFinishReason = runtime.collided ? 'collision' : 'finished',
  ) {
    if (fitnessRef.current.has(genomeId)) return
    const record = recordsRef.current.get(genomeId)
    if (!record) return
    record.reason = reason

    const fitness = calculateFitness(runtime, record.progress)
    fitnessRef.current.set(genomeId, fitness)
    setCurrentBest((best) => Math.max(best, fitness))
    setAlive((value) => Math.max(0, value - 1))
  }

  const canControlGeneration =
    Boolean(selectedRun) &&
    (status === 'running' || status === 'paused') &&
    !pendingSave.current &&
    !generationClosing.current &&
    !saveInFlight.current

  function finishCar(id: string) {
    const control = carControls.current.get(id)
    if (control) control.finish('manual')
    else
      handleAgentFinish(
        id,
        { aliveSeconds: 0, traveledDistance: 0, collided: false },
        'manual',
      )
  }

  function advanceGeneration() {
    if (
      !canControlGeneration ||
      generationClosing.current ||
      saveInFlight.current ||
      pendingSave.current
    )
      return
    generationClosing.current = true
    resumeAfterEvolution.current = status === 'running'
    for (const genome of genomes)
      if (!fitnessRef.current.has(genome.id)) finishCar(genome.id)
    setStatus('evolving')
  }

  function eliminateCar(id: string) {
    if (
      !canControlGeneration ||
      generationClosing.current ||
      saveInFlight.current ||
      pendingSave.current ||
      fitnessRef.current.has(id) ||
      !recordsRef.current.has(id)
    )
      return
    resumeAfterEvolution.current = status === 'running'
    finishCar(id)
    if (cameraMode === 'follow' && genomes[selectedCar]?.id === id)
      setCameraMode('free')
    if (fitnessRef.current.size === genomes.length) {
      generationClosing.current = true
      setStatus('evolving')
    }
  }

  function inspectCar(id: string) {
    if (!selectedRun || status === 'evolving') return
    const index = genomes.findIndex((genome) => genome.id === id)
    if (index < 0) return
    setSelectedCar(index)
    setInspectedCar(id)
  }

  function resetTraining() {
    if (selectedRun) void loadRun(selectedRun)
  }

  async function regenerateTrack() {
    if (!selectedRun || status === 'evolving') return
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    const currentSeed = engine.config.track.seed
    const nextSeed =
      (values[0] & 0x7fffffff) === currentSeed
        ? (currentSeed + 1) % 2_147_483_648
        : values[0] & 0x7fffffff
    const track = { version: 'grand-prix-v3' as const, seed: nextSeed }

    setStatus('paused')
    setPersistenceStatus('saving')
    try {
      const updated = isGuest
        ? await guestTraining.updateGuestTrack(selectedRun.id, track)
        : await withFreshAccess((token) =>
            trainingApi.updateTrainingTrack(token, selectedRun.id, track),
          )
      engine.config.track = track
      pendingSave.current = null
      generationClosing.current = false
      carControls.current.clear()
      setInspectedCar(null)
      setSelectedRun(updated)
      setGenomes([...engine.genomes])
      setAlive(engine.config.populationSize)
      setCurrentBest(0)
      setMetrics({
        generation: Math.max(0, engine.generation - 1),
        bestFitness: 0,
        averageFitness: 0,
        speciesCount: engine.currentSpecies().length,
      })
      setRunId((value) => value + 1)
      recordsRef.current = createEvaluationRecords(engine.genomes)
      fitnessRef.current = new Map()
      queryClient.setQueryData<TrainingRun[]>(runsKey, (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)),
      )
      setPersistenceStatus('saved')
    } catch {
      setPersistenceStatus('error')
    }
  }

  useEffect(() => {
    if (
      status === 'running' &&
      alive === 0 &&
      fitnessRef.current.size === genomes.length
    ) {
      generationClosing.current = true
      resumeAfterEvolution.current = true
      setStatus('evolving')
    }
  }, [alive, genomes.length, status])

  useEffect(() => {
    if (status !== 'evolving') return

    const timer = window.setTimeout(() => {
      void completeGeneration()
    }, 250)

    async function completeGeneration() {
      const completedMetrics = engine.evolve(fitnessRef.current)
      const durationMs = Math.round(
        performance.now() - generationStartedAt.current,
      )
      setMetrics(completedMetrics)
      setGenomes([...engine.genomes])
      setAlive(engine.config.populationSize)
      setCurrentBest(0)
      setInspectedCar(null)
      recordsRef.current = createEvaluationRecords(engine.genomes)
      fitnessRef.current = new Map()
      if (selectedRun) {
        const saved = await persistFromEffect(selectedRun, {
          generation: engine.generation,
          snapshot: engine.toSnapshot(),
          bestGenome: engine.genomes[0],
          bestFitness: completedMetrics.bestFitness,
          averageFitness: completedMetrics.averageFitness,
          speciesCount: completedMetrics.speciesCount,
          durationMs,
        })
        if (activeRunId.current !== selectedRun.id) return
        generationStartedAt.current = performance.now()
        if (saved) generationClosing.current = false
        setStatus(saved && resumeAfterEvolution.current ? 'running' : 'paused')
      }
    }

    return () => window.clearTimeout(timer)
  }, [engine, selectedRun, status])

  async function retrySave() {
    const pending = pendingSave.current
    if (!pending || saveInFlight.current) return
    const saved = await persistGeneration(pending.run, pending.input)
    if (saved && activeRunId.current === pending.run.id) {
      generationStartedAt.current = performance.now()
      generationClosing.current = false
      setStatus(resumeAfterEvolution.current ? 'running' : 'paused')
    }
  }

  async function updateRunStatus(id: string, next: TrainingRun['status']) {
    try {
      if (isGuest) await guestTraining.updateGuestStatus(id, next)
      else
        await withFreshAccess((token) =>
          trainingApi.updateTrainingStatus(token, id, next),
        )
    } catch {
      setSelectorError('No se pudo actualizar el estado del entrenamiento.')
    }
  }

  function startTraining() {
    if (!selectedRun) return
    generationStartedAt.current = performance.now()
    resumeAfterEvolution.current = true
    setStatus('running')
    void updateRunStatus(selectedRun.id, 'RUNNING')
  }

  function togglePause() {
    if (!selectedRun || saveInFlight.current) return
    if (pendingSave.current) {
      void retrySave()
      return
    }
    const nextStatus = status === 'paused' ? 'running' : 'paused'
    setStatus(nextStatus)
    void updateRunStatus(
      selectedRun.id,
      nextStatus === 'running' ? 'RUNNING' : 'PAUSED',
    )
  }

  function selectAnotherRun() {
    if (selectedRun) {
      void updateRunStatus(selectedRun.id, 'PAUSED')
    }
    activeRunId.current = null
    pendingSave.current = null
    setStatus('idle')
    setSelectedRun(null)
    void runsQuery.refetch()
  }

  return (
    <main className="training-lab neat-lab">
      <SceneCanvas>
        <Suspense fallback={null}>
          <NeatTrainingScene
            key={generationKey}
            generationKey={generationKey}
            genomes={genomes}
            onAgentFinish={handleAgentFinish}
            onInspectCar={inspectCar}
            onRegisterCar={registerCar}
            onCheckpoint={handleCheckpoint}
            running={running}
            timeScale={timeScale}
            track={activeTrack}
            cameraMode={cameraMode}
            selectedGenomeId={genomes[selectedCar]?.id ?? genomes[0].id}
            showRaycasts={showRaycasts}
          />
        </Suspense>
      </SceneCanvas>
      {selectedRun ? (
        <NeatTrainingHud
          alive={alive}
          timeScale={timeScale}
          onTimeScaleChange={setTimeScale}
          currentBest={currentBest}
          generation={engine.generation}
          metrics={metrics}
          onPauseToggle={togglePause}
          onRegenerateTrack={() => void regenerateTrack()}
          onReset={resetTraining}
          onSelectRun={selectAnotherRun}
          onStart={startTraining}
          onAdvanceGeneration={advanceGeneration}
          canAdvanceGeneration={canControlGeneration}
          inspectingCar={inspectedCar !== null}
          onDismissCar={() => setInspectedCar(null)}
          persistenceStatus={persistenceStatus}
          localOnly={isGuest}
          onRetrySave={pendingSave.current ? () => void retrySave() : undefined}
          populationSize={engine.config.populationSize}
          status={status}
          trainingName={selectedRun.name}
          cameraMode={cameraMode}
          onCameraModeChange={setCameraMode}
          selectedCar={selectedCar}
          onSelectedCarChange={(index) => {
            const genome = genomes[index]
            if (genome) inspectCar(genome.id)
          }}
          trackSeed={activeTrack.recipe.seed}
          showRaycasts={showRaycasts}
          onShowRaycastsChange={setShowRaycasts}
        />
      ) : (
        <TrainingRunSelector
          busy={selectorBusy || runsQuery.isLoading}
          error={
            selectorError ??
            (runsQuery.error instanceof Error ? runsQuery.error.message : null)
          }
          onCreate={createRun}
          onDelete={deleteRun}
          onLoad={loadRun}
          localOnly={isGuest}
          runs={runsQuery.data ?? []}
        />
      )}
      {inspectedCar && selectedRun && (
        <CarActions
          name={`Auto ${String(genomes.findIndex((g) => g.id === inspectedCar) + 1).padStart(2, '0')}`}
          status={`${recordsRef.current.get(inspectedCar)?.reason === 'manual' ? 'Eliminado manualmente' : fitnessRef.current.has(inspectedCar) ? 'Evaluación terminada' : status === 'idle' ? 'Preparado' : 'En pista'} · ${recordsRef.current.get(inspectedCar)?.progress.passedCheckpoints ?? 0}/${activeTrack.checkpoints.length} sectores`}
          onFollow={() => setCameraMode('follow')}
          onEliminate={() => eliminateCar(inspectedCar)}
          canEliminate={
            canControlGeneration && !fitnessRef.current.has(inspectedCar)
          }
          onClose={() => setInspectedCar(null)}
        />
      )}
    </main>
  )
}
