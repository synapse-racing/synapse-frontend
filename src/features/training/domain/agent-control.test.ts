import { expect, it, vi } from 'vitest'
import { createAgentControl } from './agent-control.ts'
import { prototypeTrack } from './track.ts'
import { createSimulationState } from '../simulation/race-contract.ts'
import { calculateFitness } from './fitness.ts'

it('takes current simulation results once without adding a collision penalty on manual termination', () => {
  const state = createSimulationState(prototypeTrack)
  state.elapsedSteps = 60
  state.traveledDistance = 25
  const finish = vi.fn()
  const control = createAgentControl(state, prototypeTrack, finish)
  expect(control.finish()).toBe(true)
  expect(control.finished).toBe(true)
  expect(control.reason).toBe('manual')
  expect(finish).toHaveBeenCalledWith(
    { aliveSeconds: 3, traveledDistance: 25, collided: false },
    'manual',
  )
  const fitness = calculateFitness(finish.mock.calls[0][0], {
    expectedCheckpoint: 2,
    passedCheckpoints: 2,
    laps: 0,
  })
  expect(fitness).toBe(2053)
  expect(control.finish('collision')).toBe(false)
  expect(finish).toHaveBeenCalledOnce()
})

it('keeps a naturally completed evaluation unchanged when a manual action arrives later', () => {
  const state = createSimulationState(prototypeTrack)
  state.collided = true
  const finish = vi.fn()
  const control = createAgentControl(state, prototypeTrack, finish)
  control.finish('collision')
  expect(control.finish('manual')).toBe(false)
  expect(control.reason).toBe('collision')
  expect(finish).toHaveBeenCalledOnce()
})
