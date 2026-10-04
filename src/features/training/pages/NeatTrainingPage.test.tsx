import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentProps, ReactNode } from 'react'
import { expect, it, vi } from 'vitest'
import { NeatTrainingPage } from './NeatTrainingPage.tsx'
import type { NeatTrainingScene } from '../components/NeatTrainingScene.tsx'
import type { TrainingRun } from '../api/training.api.ts'

const mocks = vi.hoisted(() => ({
  scene: null as ComponentProps<typeof NeatTrainingScene> | null,
  save: vi.fn(),
}))
vi.mock('../../auth/context/useAuth.ts', () => ({
  useAuth: () => ({ accessToken: 'token', renewSession: vi.fn() }),
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
  TrainingRunSelector: ({ onCreate }: { onCreate: (name: string, seed: number) => void }) =>
    <button onClick={() => onCreate('Test', 42)}>Crear prueba</button>,
}))
vi.mock('../api/training.api.ts', () => ({
  listTrainingRuns: async () => [],
  createTrainingRun: async (_: string, input: object) => ({ ...input, id: 'run', currentGeneration: 0, bestFitness: 0 }),
  updateTrainingStatus: async () => ({}),
  saveCheckpoint: (...args: unknown[]) => mocks.save(...args),
}))

it('waits for saving and retries the same snapshot before running the next generation', async () => {
  let rejectSave!: (reason: Error) => void
  let resolveRetry!: (run: TrainingRun) => void
  mocks.save.mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject }))
    .mockImplementationOnce(() => new Promise((resolve) => { resolveRetry = resolve }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><NeatTrainingPage /></MemoryRouter></QueryClientProvider>)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Crear prueba' }))
  await user.click(await screen.findByRole('button', { name: 'Iniciar' }))
  act(() => {
    const scene = mocks.scene!
    for (const genome of scene.genomes) {
      scene.onAgentFinish(genome.id, { aliveSeconds: 5, traveledDistance: 10, collided: false })
      scene.onAgentFinish(genome.id, { aliveSeconds: 5, traveledDistance: 10, collided: false })
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
  await act(async () => resolveRetry({ id: 'run', name: 'Test', currentGeneration: 1, bestFitness: 5 } as TrainingRun))
  await waitFor(() => expect(mocks.scene?.running).toBe(true))
  expect(screen.getByRole('status')).toHaveTextContent('Guardado')
  expect(mocks.save).toHaveBeenCalledTimes(2)
})
