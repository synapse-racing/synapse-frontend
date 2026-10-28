import { describe, expect, it } from 'vitest'
import {
  allowedCameraDistance,
  cameraLimits,
  firstHitDistance,
  garageColliders,
} from './garage-camera-bounds.ts'

describe('garage-camera-bounds', () => {
  it('detects intersection with the back wall when looking towards +Z', () => {
    const target: [number, number, number] = [0, 1.05, 0]
    const dirTowardsBackWall: [number, number, number] = [0, 0, 1]
    const hit = firstHitDistance(target, dirTowardsBackWall, garageColliders)

    // Back wall is at z = 7.8
    expect(hit).toBeCloseTo(7.8, 1)
  })

  it('detects intersection with side walls when looking along +X and -X', () => {
    const target: [number, number, number] = [0, 1.05, 0]
    const dirRight: [number, number, number] = [1, 0, 0]
    const dirLeft: [number, number, number] = [-1, 0, 0]

    const hitRight = firstHitDistance(target, dirRight, garageColliders)
    const hitLeft = firstHitDistance(target, dirLeft, garageColliders)

    // Side walls start at x = 10.25 and x = -10.25 (inner pillars)
    expect(hitRight).toBeCloseTo(10.25, 1)
    expect(hitLeft).toBeCloseTo(10.25, 1)
  })

  it('returns Infinity when ray is pointed towards the open exit (-Z)', () => {
    const target: [number, number, number] = [0, 1.05, 0]
    const dirExit: [number, number, number] = [0, 0, -1]
    const hit = firstHitDistance(target, dirExit, garageColliders)

    expect(hit).toBe(Infinity)
  })

  it('preserves desired distance when there is no collision', () => {
    const target: [number, number, number] = [0, 1.05, 0]
    const dirExit: [number, number, number] = [0, 0, -1]
    const allowed = allowedCameraDistance(target, dirExit, 12, garageColliders)

    expect(allowed).toBe(12)
  })

  it('restricts distance with margin when approaching the back wall and sign', () => {
    const target: [number, number, number] = [0, 1.05, 0]
    const dirTowardsBackWall: [number, number, number] = [0, 0, 1]
    const desired = 15 // Greater than the 7.8m distance to the wall

    const allowed = allowedCameraDistance(
      target,
      dirTowardsBackWall,
      desired,
      garageColliders,
    )

    // Back wall at 7.8m minus margin (0.45m) = 7.35m
    expect(allowed).toBeCloseTo(7.8 - cameraLimits.margin, 1)
    expect(allowed).toBeLessThan(desired)
  })

  it('never goes below hardMinDistance even if colliding very close to target', () => {
    const closeBox = [[-2, 0, 0.5], [2, 3, 1]] as const
    const target: [number, number, number] = [0, 1, 0]
    const dir: [number, number, number] = [0, 0, 1]

    const allowed = allowedCameraDistance(target, dir, 5, [closeBox])
    expect(allowed).toBe(cameraLimits.hardMinDistance)
  })
})
