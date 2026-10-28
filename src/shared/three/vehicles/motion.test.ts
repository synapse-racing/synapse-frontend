import { describe, expect, it } from 'vitest'
import { wheelMotion } from './motion.ts'

describe('visual wheel motion', () => {
  it('uses rendered travel, including accelerated playback and reverse', () => {
    const start = { x: 0, z: 0, yaw: 0 }
    expect(wheelMotion(start, { ...start, z: -2 }, 1.5)).toEqual({
      distance: 2,
      steering: 0,
    })
    expect(wheelMotion(start, { ...start, z: 2 }, 1.5)).toEqual({
      distance: -2,
      steering: -0,
    })
    expect(wheelMotion(start, { ...start, z: -4 }, 1.5, 2)).toEqual({
      distance: 2,
      steering: 0,
    })
  })
  it('keeps the steering direction when backing through the same curve', () => {
    const a = { x: 0, z: 0, yaw: 0 },
      b = { x: -0.1, z: -1, yaw: 0.2 }
    expect(wheelMotion(a, b, 1.5).steering).toBeGreaterThan(0)
    expect(wheelMotion(b, a, 1.5).steering).toBeCloseTo(
      wheelMotion(a, b, 1.5).steering,
    )
  })
  it('wraps yaw and ignores stationary turntables and teleports', () => {
    const a = { x: 0, z: 0, yaw: Math.PI - 0.01 },
      b = { x: 0, z: 1, yaw: -Math.PI + 0.01 }
    expect(wheelMotion(a, b, 1.5).steering).toBeCloseTo(Math.atan(0.03))
    expect(wheelMotion(a, { ...a, yaw: 2 }, 1.5)).toEqual({
      distance: 0,
      steering: 0,
    })
    expect(wheelMotion(a, { ...b, z: 100 }, 1.5)).toEqual({
      distance: 0,
      steering: 0,
    })
  })
})
