import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentProps, ReactNode } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import {
  getGuestTraining,
  listGuestRuns,
} from '../persistence/guest-training.ts'
import { NeatTrainingPage } from './NeatTrainingPage.tsx'
import type { NeatTrainingScene } from '../components/NeatTrainingScene.tsx'
import type { TrainingRun } from '../api/training.api.ts'
import { createAgentControl } from '../domain/agent-control.ts'
import { createSimulationState } from '../simulation/race-contract.ts'

const mocks = vi.hoisted(() => ({
  scene: null as ComponentProps<typeof NeatTrainingScene> | null,
  save: vi.fn(),
  guest: false,
}))
vi.mock('../../auth/context/useAuth.ts', () => ({
  useAuth: () => ({
    accessToken: mocks.guest ? null : 'token',
    status: mocks.guest ? 'visitor' : 'authenticated',
    renewSession: vi.fn(),
  }),
}))
vi.mock('../../../shared/three/SceneCanvas.tsx', () => ({
  SceneCanvas: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('../components/NeatTrainingScene.tsx', () => ({
  NeatTrainingScene: (props: ComponentProps<typeof NeatTrainingScene>) => {
    mocks.scene = props
    return null
  },
}))
vi.mock('../components/TrainingRunSelector.tsx', () => ({
  TrainingRunSelector: ({
    onCreate,
    onLoad,
    runs,
  }: {
    onCreate: (name: string, seed: number) => void
    onLoad: (run: TrainingRun) => void
    runs: TrainingRun[]
  }) => (
    <>
      <button onClick={() => onCreate('Test', 42)}>Crear prueba</button>
      {runs.map((run) => (
        <button key={run.id} onClick={() => onLoad(run)}>
          Cargar {run.name}
        </button>
      ))}
    </>
  ),
}))

beforeEach(() => {
  mocks.guest = false
  mocks.save.mockReset()
})
vi.mock('../api/training.api.ts', () => ({
  listTrainingRuns: async () => [],
  createTrainingRun: async (_: string, input: object) => ({
    ...input,
    id: 'run',
    currentGeneration: 0,
    bestFitness: 0,
  }),
  updateTrainingStatus: async () => ({}),
  saveCheckpoint: (...args: unknown[]) => mocks.save(...args),
}))

it('waits for saving and retries the same snapshot before running the next generation', async () => {
  let rejectSave!: (reason: Error) => void
  let resolveRetry!: (run: TrainingRun) => void
  mocks.save
    .mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectSave = reject
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRetry = resolve
        }),
    )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NeatTrainingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Crear prueba' }))
  await user.click(await screen.findByRole('button', { name: 'Iniciar' }))
  act(() => {
    const scene = mocks.scene!
    for (const genome of scene.genomes) {
      scene.onAgentFinish(genome.id, {
        aliveSeconds: 5,
        traveledDistance: 10,
        collided: false,
      })
      scene.onAgentFinish(genome.id, {
        aliveSeconds: 5,
        traveledDistance: 10,
        collided: false,
      })
    }
  })
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1))
  expect(mocks.scene?.running).toBe(false)
  expect(screen.getByRole('status')).toHaveTextContent('Guardando')
  await act(async () => rejectSave(new Error('Offline')))
  expect(await screen.findByRole('alert')).toHaveTextContent('pausado')
  expect(mocks.scene?.running).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Reintentar guardado' }))
  expect(mocks.save).toHaveBeenCalledTimes(2)
  expect(mocks.save.mock.calls[1][2]).toEqual(mocks.save.mock.calls[0][2])
  expect(mocks.scene?.running).toBe(false)
  await act(async () =>
    resolveRetry({
      id: 'run',
      name: 'Test',
      currentGeneration: 1,
      bestFitness: 5,
    } as TrainingRun),
  )
  await waitFor(() => expect(mocks.scene?.running).toBe(true))
  expect(screen.getByRole('status')).toHaveTextContent('Guardado')
  expect(mocks.save).toHaveBeenCalledTimes(2)
})

it('trains a guest locally and restores the last complete generation after remounting', async () => {
  mocks.guest = true
  vi.stubGlobal('indexedDB', new IDBFactory())
  function mount() {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <NeatTrainingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }
  const first = mount()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Crear prueba' }))
  await user.click(await screen.findByRole('button', { name: 'Iniciar' }))
  act(() => {
    for (const genome of mocks.scene!.genomes)
      mocks.scene!.onAgentFinish(genome.id, {
        aliveSeconds: 1,
        traveledDistance: 5,
        collided: false,
      })
  })
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Generación 2' }),
    ).toBeInTheDocument(),
  )
  await waitFor(() => expect(mocks.scene?.running).toBe(true))
  const run = (await listGuestRuns())[0]
  expect(run.currentGeneration).toBe(1)
  const record = await getGuestTraining(run.id)
  first.unmount()
  mount()
  await user.click(await screen.findByRole('button', { name: 'Cargar Test' }))
  await screen.findByRole('heading', { name: 'Generación 2' })
  expect(mocks.scene?.genomes).toEqual(record.checkpoint.snapshot.genomes)
  expect(mocks.scene?.running).toBe(false)
  expect(screen.getByText('En este dispositivo')).toBeInTheDocument()
  expect(mocks.save).not.toHaveBeenCalled()
})

function mountTraining() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NeatTrainingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

function registerCars() {
  const scene = mocks.scene!
  return scene.genomes.map((genome) => {
    const state = createSimulationState(scene.track)
    state.elapsedSteps = 60
    state.traveledDistance = 25
    const control = createAgentControl(state, scene.track, (runtime, reason) =>
      scene.onAgentFinish(genome.id, runtime, reason),
    )
    scene.onRegisterCar(genome.id, control)
    return control
  })
}

it('advances once with current results, keeps finished scores and preserves pause', async () => {
  mocks.save.mockResolvedValue({
    id: 'run',
    name: 'Test',
    currentGeneration: 1,
    bestFitness: 3027,
  })
  const user = mountTraining()
  await user.click(screen.getByRole('button', { name: 'Crear prueba' }))
  expect(
    await screen.findByRole('button', { name: 'Pasar de generación' }),
  ).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Iniciar' }))
  const scene = mocks.scene!
  const controls = registerCars()
  act(() => {
    scene.onCheckpoint(0, `neat-car:${scene.genomes[0].id}`)
    scene.onCheckpoint(1, `neat-car:${scene.genomes[0].id}`)
    controls[0].finish('finished')
    scene.onCheckpoint(0, `neat-car:${scene.genomes[1].id}`)
  })
  await user.click(screen.getByRole('button', { name: 'Pausar' }))
  await user.dblClick(
    screen.getByRole('button', { name: 'Pasar de generación' }),
  )
  await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
  const input = mocks.save.mock.calls[0][2]
  expect(input.generation).toBe(1)
  expect(input.bestFitness).toBe(2053)
  expect(input.averageFitness).toBeCloseTo(
    (2053 + 1053 + (controls.length - 2) * 53) / controls.length,
  )
  expect(controls.every((control) => control.finished)).toBe(true)
  expect(controls[0].reason).toBe('finished')
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Reanudar' })).toBeEnabled(),
  )
  expect(mocks.scene!.running).toBe(false)
  expect(
    screen.getByRole('button', { name: 'Pasar de generación' }),
  ).toBeEnabled()
})

it('follows and eliminates a selected car and closes its panel without pausing', async () => {
  const user = mountTraining()
  await user.click(screen.getByRole('button', { name: 'Crear prueba' }))
  await user.click(await screen.findByRole('button', { name: 'Iniciar' }))
  const controls = registerCars()
  act(() => mocks.scene!.onInspectCar(mocks.scene!.genomes[1].id))
  await user.click(
    within(screen.getByLabelText('Opciones de Auto 02')).getByRole('button', {
      name: 'Seguir auto',
    }),
  )
  expect(mocks.scene!.cameraMode).toBe('follow')
  expect(mocks.scene!.selectedGenomeId).toBe(mocks.scene!.genomes[1].id)
  await user.click(screen.getByRole('button', { name: 'Eliminar auto' }))
  expect(controls[1].reason).toBe('manual')
  expect(mocks.scene!.cameraMode).toBe('free')
  expect(screen.getByRole('button', { name: 'Eliminar auto' })).toBeDisabled()
  expect(screen.getByLabelText('Opciones de Auto 02')).toHaveTextContent(
    'Eliminado manualmente',
  )
  await user.keyboard('{Escape}')
  expect(screen.queryByLabelText('Opciones de Auto 02')).not.toBeInTheDocument()
  expect(mocks.scene!.running).toBe(true)
  expect(mocks.save).not.toHaveBeenCalled()
})

it('releases follow camera when the followed car crashes on its own', async () => {
  const user = mountTraining()
  await user.click(screen.getByRole('button', { name: 'Crear prueba' }))
  await user.click(await screen.findByRole('button', { name: 'Iniciar' }))
  const controls = registerCars()
  act(() => mocks.scene!.onInspectCar(mocks.scene!.genomes[1].id))
  await user.click(
    within(screen.getByLabelText('Opciones de Auto 02')).getByRole('button', {
      name: 'Seguir auto',
    }),
  )
  expect(mocks.scene!.cameraMode).toBe('follow')
  expect(mocks.scene!.selectedGenomeId).toBe(mocks.scene!.genomes[1].id)

  act(() => {
    controls[0].finish('collision')
  })
  expect(mocks.scene!.cameraMode).toBe('follow')

  act(() => {
    controls[1].finish('collision')
  })
  expect(mocks.scene!.cameraMode).toBe('free')
})

it('evolves after eliminating the last active car while paused', async () => {
  mocks.save.mockResolvedValue({
    id: 'run',
    name: 'Test',
    currentGeneration: 1,
    bestFitness: 53,
  })
  const user = mountTraining()
  await user.click(screen.getByRole('button', { name: 'Crear prueba' }))
  await user.click(await screen.findByRole('button', { name: 'Iniciar' }))
  const scene = mocks.scene!
  const controls = registerCars()
  act(() => controls.slice(1).forEach((control) => control.finish('collision')))
  await user.click(screen.getByRole('button', { name: 'Pausar' }))
  act(() => mocks.scene!.onInspectCar(scene.genomes[0].id))
  await user.click(
    within(screen.getByLabelText('Opciones de Auto 01')).getByRole('button', {
      name: 'Seguir auto',
    }),
  )
  expect(
    screen.queryByLabelText('Opciones del entrenamiento'),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Eliminar auto' }))
  await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce())
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Generación 2' }),
    ).toBeInTheDocument(),
  )
  expect(mocks.scene!.running).toBe(false)
  expect(mocks.scene!.cameraMode).toBe('free')
})
