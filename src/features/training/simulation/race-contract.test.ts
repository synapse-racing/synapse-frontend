import { describe, expect, it } from 'vitest'
import { generateTrack, prototypeTrack } from '../domain/track.ts'
import {
  createSimulationState,
  isDrivable,
  senseSimulation,
  stepSimulation,
} from './race-contract.ts'

describe('race simulation contract', () => {
  it('produces a stable golden straight-line trajectory', () => {
    const state = createSimulationState()

    for (let step = 0; step < 20; step += 1) {
      stepSimulation(state, 0, Math.tanh(2))
    }

    expect(state.x).toBe(-10)
    expect(state.yaw).toBe(0)
    expect(state.speed).toBeCloseTo(5.266136972643145, 12)
    expect(state.z).toBeCloseTo(9.843669933934567, 12)
  })

  it('keeps left and right sensors in the training angle order', () => {
    const state = createSimulationState()
    state.x = -11
    state.z = 10
    const sensors = senseSimulation(state)

    expect(sensors[0]).not.toBe(sensors[4])
    expect(sensors).toHaveLength(5)
    expect(sensors.every((value) => value >= 0 && value <= 1)).toBe(true)
  })

  it('repeats an identical trajectory from identical state', () => {
    const first = createSimulationState()
    const second = createSimulationState()

    for (let step = 0; step < 100; step += 1) {
      stepSimulation(first, 0.2, 0.8)
      stepSimulation(second, 0.2, 0.8)
    }

    expect(second).toEqual(first)
  })

  it('terminates the agent on its first wall collision', () => {
    const state = createSimulationState()
    if (prototypeTrack.geometry.kind !== 'rectangular-ring') {
      throw new Error('Expected the prototype rectangular track')
    }
    state.x = -10
    state.z = -prototypeTrack.geometry.outerZ + 0.01
    const initialZ = state.z
    const result = stepSimulation(state, 0, 1)

    expect(result).toMatchObject({ collision: true, finished: true })
    expect(state.collided).toBe(true)
    expect(state.z).toBe(initialZ)
  })

  it('generates deterministic but varied drivable tracks', () => {
    const first = generateTrack({ version: 'curved-loop-v1', seed: 123 })
    const repeated = generateTrack({ version: 'curved-loop-v1', seed: 123 })
    const different = generateTrack({ version: 'curved-loop-v1', seed: 124 })

    expect(repeated).toEqual(first)
    expect(different.geometry).not.toEqual(first.geometry)
    expect(first.geometry.kind).toBe('centerline-loop')
    expect(first.boundaries).toHaveLength(144)
    expect(
      isDrivable(first.spawnPosition[0], first.spawnPosition[2], first),
    ).toBe(true)
  })

  it('terminates an agent after three seconds without moving', () => {
    const state = createSimulationState()
    let result = stepSimulation(state, 0, 0)
    for (let step = 1; step < 60; step += 1) {
      result = stepSimulation(state, 0, 0)
    }

    expect(result).toMatchObject({ stalled: true, finished: true })
    expect(state.elapsedSteps).toBe(60)
  })
})
