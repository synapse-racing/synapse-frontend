import { describe, expect, it } from 'vitest'
import {
  advanceTrackProgress,
  initialTrackProgress,
} from './progress.ts'
import { calculateFitness } from './fitness.ts'

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
