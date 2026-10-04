import { describe, expect, it } from 'vitest'
import { crossesCheckpoint } from './checkpoint-crossing.ts'
import { createSimulationState, stepSimulation } from './race-contract.ts'
import { generateTrack } from '../domain/track.ts'

describe('checkpoint crossings', () => {
  it('detects a diagonal corner crossing even when both endpoints are outside', () => {
    expect(crossesCheckpoint(0.8, 0.6, 1.2, 0.2, 0, 0, 0, 1, 0.5)).toBe(true)
    expect(crossesCheckpoint(1.1, 0.6, 1.5, 0.2, 0, 0, 0, 1, 0.5)).toBe(false)
    expect(crossesCheckpoint(0, 2, 0, -2, 0, 0, 0, 1, 0.5)).toBe(true)
  })

  it.each([0, 42, 42170])('finishes at either road edge without skipping sectors (seed %i)', (seed) => {
    const track = generateTrack({ version: 'grand-prix-v3', seed })
    const finish = track.checkpoints.at(-1)!
    if (track.geometry.kind === 'rectangular-ring') throw new Error('Expected a curved track')
    for (const side of [-1, 1]) {
      const state = createSimulationState(track)
      const lateral = side * (track.geometry.driveHalfWidth - 0.05)
      const cosine = Math.cos(finish.rotationY)
      const sine = Math.sin(finish.rotationY)
      state.x = finish.position[0] + cosine * lateral + sine * 0.6
      state.z = finish.position[2] - sine * lateral + cosine * 0.6
      state.yaw = finish.rotationY
      state.speed = 8
      state.expectedCheckpoint = track.checkpoints.length - 1
      state.passedCheckpoints = track.checkpoints.length - 1
      const result = stepSimulation(state, 0, 1, track)
      expect(result.collision).toBe(false)
      expect(result.finished).toBe(true)
      expect(state.laps).toBe(1)
      const stopped = { ...state }
      expect(stepSimulation(state, 0, 1, track).checkpointEntries).toEqual([])
      expect(state).toEqual(stopped)

      const incomplete = { ...stopped, laps: 0, expectedCheckpoint: 0, passedCheckpoints: 0, insideCheckpoints: track.checkpoints.map(() => false) }
      stepSimulation(incomplete, 0, 1, track)
      expect(incomplete.laps).toBe(0)
    }
  })
})
