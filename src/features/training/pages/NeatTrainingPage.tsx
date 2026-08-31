import { Canvas } from '@react-three/fiber'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Suspense,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ApiError } from '../../../shared/api/http.ts'
import { useAuth } from '../../auth/context/useAuth.ts'
import * as trainingApi from '../api/training.api.ts'
import type {
  SaveCheckpointInput,
  TrainingRun,
} from '../api/training.api.ts'
import {
  NeatTrainingHud,
  type PersistenceStatus,
  type TrainingStatus,
} from '../components/NeatTrainingHud.tsx'
import { NeatTrainingScene } from '../components/NeatTrainingScene.tsx'
import { TrainingRunSelector } from '../components/TrainingRunSelector.tsx'
import {
  calculateFitness,
  type AgentRuntime,
} from '../domain/fitness.ts'
import {
  advanceTrackProgress,
  initialTrackProgress,
  type TrackProgress,
} from '../domain/progress.ts'
import { generateTrack } from '../domain/track.ts'
import type { Genome } from '../neat/genes.ts'
import {
  NeatPopulation,
  type GenerationMetrics,
} from '../neat/population.ts'

const trainingSeed = 42_170
const neatCarPrefix = 'neat-car:'

interface EvaluationRecord {
  progress: TrackProgress
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
  const [engine, setEngine] = useState(() => new NeatPopulation(trainingSeed))
  const [genomes, setGenomes] = useState(() => [...engine.genomes])
  const [status, setStatus] = useState<TrainingStatus>('idle')
  const [alive, setAlive] = useState(engine.config.populationSize)
  const [metrics, setMetrics] = useState(() => createInitialMetrics(engine))
  const [currentBest, setCurrentBest] = useState(0)
  const [runId, setRunId] = useState(0)
  const [selectedRun, setSelectedRun] = useState<TrainingRun | null>(null)
  const [selectorBusy, setSelectorBusy] = useState(false)
  const [selectorError, setSelectorError] = useState<string | null>(null)
  const [persistenceStatus, setPersistenceStatus] =
    useState<PersistenceStatus>('idle')
  const recordsRef = useRef(createEvaluationRecords(engine.genomes))
  const fitnessRef = useRef(new Map<string, number>())
  const generationStartedAt = useRef(performance.now())

  const runsQuery = useQuery({
    queryKey: ['training-runs'],
    enabled: Boolean(auth.accessToken),
    queryFn: () => {
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
    setPersistenceStatus(run.currentGeneration > 0 ? 'saved' : 'idle')
    recordsRef.current = createEvaluationRecords(nextEngine.genomes)
    fitnessRef.current = new Map()
    generationStartedAt.current = performance.now()
  }

  async function createRun(name: string, seed: number) {
    setSelectorBusy(true)
    setSelectorError(null)
    try {
      const nextEngine = new NeatPopulation(seed, {
        track: { version: 'curved-loop-v1', seed },
      })
      const run = await withFreshAccess((token) =>
        trainingApi.createTrainingRun(token, {
          name,
          seed,
          config: nextEngine.config,
        }),
      )
      activateTraining(nextEngine, run)
      await runsQuery.refetch()
    } catch (error) {
      setSelectorError(error instanceof Error ? error.message : 'No se pudo crear')
    } finally {
      setSelectorBusy(false)
    }
  }

  async function loadRun(run: TrainingRun) {
    setSelectorBusy(true)
    setSelectorError(null)
    try {
      const checkpoint = await withFreshAccess((token) =>
        trainingApi.getLatestCheckpoint(token, run.id),
      )
      const nextEngine = checkpoint
        ? NeatPopulation.fromSnapshot(checkpoint.snapshot)
        : new NeatPopulation(run.seed, run.config)
      activateTraining(nextEngine, run)
      void withFreshAccess((token) =>
        trainingApi.updateTrainingStatus(token, run.id, 'PAUSED'),
      )
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
      await withFreshAccess((token) => trainingApi.deleteTrainingRun(token, run.id))
      await runsQuery.refetch()
    } catch (error) {
      setSelectorError(error instanceof Error ? error.message : 'No se pudo eliminar')
    } finally {
      setSelectorBusy(false)
    }
  }

  const persistGeneration = useEffectEvent(
    async (run: TrainingRun, input: SaveCheckpointInput) => {
      setPersistenceStatus('saving')
      try {
        const updated = await withFreshAccess((token) =>
          trainingApi.saveCheckpoint(token, run.id, input),
        )
        setSelectedRun(updated)
        queryClient.setQueryData<TrainingRun[]>(['training-runs'], (current) =>
          current?.map((item) => (item.id === updated.id ? updated : item)),
        )
        setPersistenceStatus('saved')
      } catch {
        setPersistenceStatus('error')
      }
    },
  )

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
  }

  function handleAgentFinish(genomeId: string, runtime: AgentRuntime) {
    if (fitnessRef.current.has(genomeId)) return
    const record = recordsRef.current.get(genomeId)
    if (!record) return

    const fitness = calculateFitness(runtime, record.progress)
    fitnessRef.current.set(genomeId, fitness)
    setCurrentBest((best) => Math.max(best, fitness))
    setAlive((value) => Math.max(0, value - 1))
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
    const track = { version: 'curved-loop-v1' as const, seed: nextSeed }

    setStatus('paused')
    setPersistenceStatus('saving')
    try {
      const updated = await withFreshAccess((token) =>
        trainingApi.updateTrainingTrack(token, selectedRun.id, track),
      )
      engine.config.track = track
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
      queryClient.setQueryData<TrainingRun[]>(['training-runs'], (current) =>
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
      setStatus('evolving')
    }
  }, [alive, genomes.length, status])

  useEffect(() => {
    if (status !== 'evolving') return

    const timer = window.setTimeout(() => {
      const completedMetrics = engine.evolve(fitnessRef.current)
      const durationMs = Math.round(performance.now() - generationStartedAt.current)
      setMetrics(completedMetrics)
      setGenomes([...engine.genomes])
      setAlive(engine.config.populationSize)
      setCurrentBest(0)
      recordsRef.current = createEvaluationRecords(engine.genomes)
      fitnessRef.current = new Map()
      generationStartedAt.current = performance.now()
      setStatus('running')
      if (selectedRun) {
        void persistGeneration(selectedRun, {
          generation: engine.generation,
          snapshot: engine.toSnapshot(),
          bestGenome: engine.genomes[0],
          bestFitness: completedMetrics.bestFitness,
          averageFitness: completedMetrics.averageFitness,
          speciesCount: completedMetrics.speciesCount,
          durationMs,
        })
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [engine, selectedRun, status])

  function startTraining() {
    if (!selectedRun) return
    generationStartedAt.current = performance.now()
    setStatus('running')
    void withFreshAccess((token) =>
      trainingApi.updateTrainingStatus(token, selectedRun.id, 'RUNNING'),
    )
  }

  function togglePause() {
    if (!selectedRun) return
    const nextStatus = status === 'paused' ? 'running' : 'paused'
    setStatus(nextStatus)
    void withFreshAccess((token) =>
      trainingApi.updateTrainingStatus(
        token,
        selectedRun.id,
        nextStatus === 'running' ? 'RUNNING' : 'PAUSED',
      ),
    )
  }

  function selectAnotherRun() {
    if (selectedRun) {
      void withFreshAccess((token) =>
        trainingApi.updateTrainingStatus(token, selectedRun.id, 'PAUSED'),
      )
    }
    setStatus('idle')
    setSelectedRun(null)
    void runsQuery.refetch()
  }

  return (
    <main className="training-lab neat-lab">
      <Canvas
        shadows
        camera={{ position: [0, 38, 34], fov: 52, near: 0.1, far: 140 }}
        dpr={[1, 1.35]}
      >
        <Suspense fallback={null}>
          <NeatTrainingScene
            generationKey={generationKey}
            genomes={genomes}
            onAgentFinish={handleAgentFinish}
            onCheckpoint={handleCheckpoint}
            running={running}
            track={activeTrack}
          />
        </Suspense>
      </Canvas>
      {selectedRun ? (
        <NeatTrainingHud
          alive={alive}
          currentBest={currentBest}
          generation={engine.generation}
          metrics={metrics}
          onPauseToggle={togglePause}
          onRegenerateTrack={() => void regenerateTrack()}
          onReset={resetTraining}
          onSelectRun={selectAnotherRun}
          onStart={startTraining}
          persistenceStatus={persistenceStatus}
          populationSize={engine.config.populationSize}
          status={status}
          trainingName={selectedRun.name}
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
          runs={runsQuery.data ?? []}
        />
      )}
    </main>
  )
}
