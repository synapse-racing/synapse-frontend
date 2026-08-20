import { describe, expect, it } from 'vitest'
import {
  advanceTrackProgress,
  initialTrackProgress,
} from './progress.ts'
import {
  normalizeSensorDistance,
  sensorDirection,
  sensorMaxDistance,
} from './sensors.ts'
import { calculateFitness } from './fitness.ts'

describe('sensor domain', () => {
  it('points the central sensor forward and side sensors symmetrically', () => {
    expect(sensorDirection(0)).toEqual([0, 0, -1])

    const left = sensorDirection(-60)
    const right = sensorDirection(60)
    expect(left[0]).toBeCloseTo(-right[0])
    expect(left[2]).toBeCloseTo(right[2])
  })

  it('normalizes and clamps ray distances', () => {
    expect(normalizeSensorDistance(null)).toBe(1)
    expect(normalizeSensorDistance(sensorMaxDistance / 2)).toBe(0.5)
    expect(normalizeSensorDistance(-1)).toBe(0)
    expect(normalizeSensorDistance(sensorMaxDistance * 2)).toBe(1)
  })
})

describe('track progress domain', () => {
  it('ignores checkpoints crossed out of order', () => {
    expect(advanceTrackProgress(initialTrackProgress, 2, 4)).toBe(
      initialTrackProgress,
    )
  })

  it('advances ordered checkpoints and completes a lap', () => {
    let progress = initialTrackProgress
    for (const checkpoint of [0, 1, 2, 3]) {
      progress = advanceTrackProgress(progress, checkpoint, 4)
    }

    expect(progress).toEqual({
      expectedCheckpoint: 0,
      laps: 1,
      passedCheckpoints: 4,
    })
  })
})

describe('fitness domain', () => {
  it('prioritizes ordered progress over local movement', () => {
    const movingFitness = calculateFitness(
      { aliveSeconds: 20, collided: false, traveledDistance: 100 },
      initialTrackProgress,
    )
    const checkpointFitness = calculateFitness(
      { aliveSeconds: 5, collided: true, traveledDistance: 5 },
      { expectedCheckpoint: 1, laps: 0, passedCheckpoints: 1 },
    )

    expect(checkpointFitness).toBeGreaterThan(movingFitness)
  })
})
