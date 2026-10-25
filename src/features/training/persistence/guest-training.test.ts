import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { beforeEach, expect, it, vi } from 'vitest'
import { NeatPopulation } from '../neat/population.ts'
import {
  createGuestRun,
  deleteGuestRun,
  getGuestTraining,
  listGuestRuns,
  saveGuestCheckpoint,
  updateGuestTrack,
} from './guest-training.ts'
import { importGuestTrainings } from './import-guest-training.ts'
import type { SaveCheckpointInput } from '../api/training.api.ts'

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.restoreAllMocks()
})

function create() {
  const engine = new NeatPopulation(42, {
    populationSize: 6,
    track: { version: 'grand-prix-v3', seed: 42 },
  })
  return createGuestRun({
    name: 'Local driver',
    seed: 42,
    config: engine.config,
  })
}

async function checkpoint(id: string): Promise<SaveCheckpointInput> {
  const record = await getGuestTraining(id)
  const engine = NeatPopulation.fromSnapshot(record.checkpoint.snapshot)
  const metrics = engine.evolve(
    new Map(engine.genomes.map((g, i) => [g.id, i + 5])),
  )
  return {
    generation: engine.generation,
    snapshot: engine.toSnapshot(),
    bestGenome: engine.genomes[0],
    bestFitness: metrics.bestFitness,
    averageFitness: metrics.averageFitness,
    speciesCount: metrics.speciesCount,
    durationMs: 1000,
  }
}

it('restores a full population, preserves metrics on retry and resets the track without losing its generation', async () => {
  const run = await create()
  const saved = await checkpoint(run.id)
  await saveGuestCheckpoint(run.id, saved)
  await saveGuestCheckpoint(run.id, saved)
  const record = await getGuestTraining(run.id)
  expect(
    NeatPopulation.fromSnapshot(record.checkpoint.snapshot).toSnapshot(),
  ).toEqual(saved.snapshot)
  expect(record.metrics).toHaveLength(1)
  expect(record.bestGenome).toEqual(saved.bestGenome)
  expect((await listGuestRuns())[0].currentGeneration).toBe(1)
  await updateGuestTrack(run.id, { version: 'grand-prix-v3', seed: 777 })
  const changed = await getGuestTraining(run.id)
  expect(changed.checkpoint.snapshot.config.track.seed).toBe(777)
  expect(changed.checkpoint.generation).toBe(1)
  expect(changed.metrics).toEqual([])
  expect(changed.bestGenome).toBeNull()
  await deleteGuestRun(run.id)
  expect(await listGuestRuns()).toEqual([])
})

it('reports a failed write and keeps the previous checkpoint intact', async () => {
  const run = await create()
  const next = await checkpoint(run.id)
  const put = vi
    .spyOn(IDBObjectStore.prototype, 'put')
    .mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
  await expect(saveGuestCheckpoint(run.id, next)).rejects.toThrow(
    'No se pudo guardar',
  )
  put.mockRestore()
  expect((await getGuestTraining(run.id)).checkpoint.generation).toBe(0)
})

it('keeps local data on upload failure and removes it only after a successful account import', async () => {
  const run = await create()
  const input = await checkpoint(run.id)
  await saveGuestCheckpoint(run.id, input)
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'remote' }), { status: 201 }),
    )
  vi.stubGlobal('fetch', fetch)
  await expect(importGuestTrainings('token', vi.fn())).rejects.toThrow(
    'Offline',
  )
  expect(await listGuestRuns()).toHaveLength(1)
  expect(await importGuestTrainings('token', vi.fn())).toBe(1)
  const firstBody = JSON.parse(fetch.mock.calls[0][1].body)
  const retryBody = JSON.parse(fetch.mock.calls[1][1].body)
  expect(retryBody).toEqual(firstBody)
  expect(retryBody.sourceId).toBe(run.id)
  expect(retryBody.metrics).toHaveLength(1)
  expect(await listGuestRuns()).toEqual([])
})

it('fails clearly when local storage is unavailable', async () => {
  vi.stubGlobal('indexedDB', undefined)
  await expect(create()).rejects.toThrow('no está disponible')
})

it('retains the local copy when an import is interrupted after the server response', async () => {
  const run = await create()
  const controller = new AbortController()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      controller.abort()
      return new Response('{}', { status: 201 })
    }),
  )
  await expect(
    importGuestTrainings('token', vi.fn(), controller.signal),
  ).rejects.toThrow()
  expect((await listGuestRuns())[0].id).toBe(run.id)
})
