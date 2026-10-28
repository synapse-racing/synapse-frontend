import { describe, expect, it } from 'vitest'
import {
  paddockCarMotion,
  paddockShot,
  paddockShots,
  totalPaddockCycleDuration,
} from './paddock-showcase.ts'

describe('paddockShowcase', () => {
  it('cycles smoothly through all 4 configured shots', () => {
    expect(paddockShots).toHaveLength(4)
    expect(totalPaddockCycleDuration).toBeGreaterThan(20)

    const initial = paddockShot(0)
    expect(initial.index).toBe(0)
    expect(initial.progress).toBe(0)
    expect(initial.shot.name).toBe('Hero 3/4 Frontal')

    // Mid-way through shot 0 (duration is 6s)
    const midShot0 = paddockShot(3)
    expect(midShot0.index).toBe(0)
    expect(midShot0.progress).toBeCloseTo(0.5, 2)

    // Shot 1 begins at 6s
    const startShot1 = paddockShot(6.1)
    expect(startShot1.index).toBe(1)
    expect(startShot1.shot.name).toBe('Perfil Lateral Dinámico')

    // Wraps cleanly around full cycle
    const wrapped = paddockShot(totalPaddockCycleDuration + 2)
    expect(wrapped.index).toBe(0)
    expect(wrapped.progress).toBeGreaterThan(0)
  })

  it('calculates realistic car micro-animations when active and zeros when paused', () => {
    const active = paddockCarMotion(5, false)
    expect(active.turntableAngle).toBeGreaterThan(0)
    expect(Math.abs(active.idleBounce)).toBeLessThan(0.01)
    expect(Math.abs(active.idlePitch)).toBeLessThan(0.01)
    expect(typeof active.steerAngle).toBe('number')

    const paused = paddockCarMotion(5, true)
    expect(paused.turntableAngle).toBe(0)
    expect(paused.idleBounce).toBe(0)
    expect(paused.idlePitch).toBe(0)
  })

  it('validates shot parameters for 3D camera integrity', () => {
    for (const shot of paddockShots) {
      expect(shot.duration).toBeGreaterThan(4)
      expect(shot.fov).toBeGreaterThanOrEqual(30)
      expect(shot.fov).toBeLessThanOrEqual(60)
      expect(shot.position).toHaveLength(3)
      expect(shot.target).toHaveLength(3)
      expect(shot.drift).toHaveLength(3)
      const dist = Math.hypot(
        shot.position[0] - shot.target[0],
        shot.position[1] - shot.target[1],
        shot.position[2] - shot.target[2],
      )
      expect(dist).toBeGreaterThan(4)
      expect(dist).toBeLessThan(18)
    }
  })
})
