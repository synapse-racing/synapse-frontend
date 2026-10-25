import { describe, expect, it } from 'vitest'
import { generateTrack } from '../../features/training/domain/track.ts'
import { isDrivable } from '../../features/training/simulation/race-contract.ts'
import {
  createExhibitionPath,
  exhibitionCar,
  exhibitionShot,
} from './exhibition.ts'

describe('menu exhibition', () => {
  it('directs five shots and wraps the sequence without resetting the race', () => {
    expect([0, 8, 16, 23, 31].map((t) => exhibitionShot(t).index)).toEqual([
      0, 1, 2, 3, 4,
    ])
    expect(exhibitionShot(40)).toEqual(exhibitionShot(0))
    expect(exhibitionShot(80.5)).toEqual(exhibitionShot(0.5))
  })

  it.each([42, 42170])(
    'keeps four exhibition lanes on circuit %i across multiple laps',
    (seed) => {
      const track = generateTrack({ version: 'curved-loop-v1', seed })
      const path = createExhibitionPath(track)
      for (const key of ['x', 'z', 'yaw'] as const)
        expect(path.pose(0)[key]).toBeCloseTo(path.pose(path.length)[key], 8)
      for (let time = 0; time < 80; time += 0.25) {
        for (let car = 0; car < 4; car++) {
          const pose = exhibitionCar(path, time, car)
          expect(isDrivable(pose.x, pose.z, track)).toBe(true)
          expect(Number.isFinite(pose.yaw)).toBe(true)
          expect(pose.speed).toBeGreaterThan(0)
          expect(pose.speed).toBeLessThanOrEqual(16)
        }
      }
    },
  )
})
