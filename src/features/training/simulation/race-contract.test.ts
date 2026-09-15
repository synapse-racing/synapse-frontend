import { describe, expect, it } from 'vitest'
import { generateTrack, prototypeTrack } from '../domain/track.ts'
import {
  createSimulationState,
  isDrivable,
  senseSimulation,
  stepSimulation,
} from './race-contract.ts'

describe('race simulation contract', () => {
  it('draws the actual sensor hits without changing sensor readings or car state', () => {
    const state = createSimulationState()
    state.z = 10
    const before = structuredClone(state)
    const positions = new Float32Array(30)
    const hits = new Uint8Array(5)
    const readings = senseSimulation(state)
    expect(senseSimulation(state, prototypeTrack, positions, hits)).toEqual(readings)
    expect([...hits]).toEqual([1, 1, 0, 1, 1])
    expect(state).toEqual(before)
    for (let i = 0; i < 5; i++) {
      const offset = i * 6
      expect(positions[offset]).toBe(-10)
      expect(positions[offset + 2]).toBe(8.75)
      expect(Math.hypot(positions[offset + 3] - positions[offset], positions[offset + 5] - positions[offset + 2])).toBeCloseTo(readings[i] * 8, 5)
    }
    expect(positions[3]).toBeCloseTo(-13.35, 5)
    expect(positions[27]).toBeCloseTo(-6.65, 5)
    expect(positions[17]).toBeCloseTo(0.75, 5)
  })

  it('marks hits at the maximum range and clears them when the border is out of range', () => {
    const state = createSimulationState()
    const hits = new Uint8Array(5)
    const originZ = state.z - 1.25
    const track = { ...prototypeTrack, boundaries: [[-20, originZ - 8, 0, originZ - 8] as const] }
    expect(senseSimulation(state, track, undefined, hits)[2]).toBe(1)
    expect(hits[2]).toBe(1)
    track.boundaries = [[-20, originZ - 8.01, 0, originZ - 8.01]]
    senseSimulation(state, track, undefined, hits)
    expect([...hits]).toEqual([0, 0, 0, 0, 0])
  })

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
