import { describe, expect, it } from 'vitest'
import { generateTrack } from './track.ts'
import { createSimulationState, stepSimulation } from '../simulation/race-contract.ts'

describe('technical circuits', () => {
  it('allows a steering controller to complete full laps with the real car physics', () => {
    for (const seed of [0, 1, 2, 7, 42, 123, 42170, 999999]) {
      const track = generateTrack({ version: 'technical-loop-v2', seed })
      if (track.geometry.kind !== 'centerline-loop') throw new Error('Expected loop')
      const points = track.geometry.centerline
      const state = createSimulationState(track)
      for (let step = 0; step < 3600; step++) {
        let nearest = 0, distance = Infinity
        points.forEach((point, index) => {
          const nextDistance = Math.hypot(point[0] - state.x, point[1] - state.z)
          if (nextDistance < distance) { nearest = index; distance = nextDistance }
        })
        const target = points[(nearest + 2) % points.length]
        const yaw = Math.atan2(-(target[0] - state.x), -(target[1] - state.z))
        const error = Math.atan2(Math.sin(yaw - state.yaw), Math.cos(yaw - state.yaw))
        const result = stepSimulation(state, Math.max(-1, Math.min(1, error * 1.8)), 0.65, track)
        if (result.finished) break
      }
      expect(state.collided).toBe(false)
      expect(state.laps).toBe(1)
      expect(state.passedCheckpoints).toBe(16)
      expect(state.elapsedSteps / 20).toBeLessThan(180)
    }
  })

  it('generates long closed circuits with alternating bends and non-crossing road edges', () => {
    for (let seed = 0; seed < 40; seed++) {
      const track = generateTrack({ version: 'technical-loop-v2', seed })
      expect(track).toEqual(generateTrack(track.recipe))
      if (track.geometry.kind !== 'centerline-loop') throw new Error('Expected loop')
      const points = track.geometry.centerline
      let length = 0
      let reversals = 0
      let lastSign = 0
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length], c = points[(i + 2) % points.length]
        length += Math.hypot(b[0] - a[0], b[1] - a[1])
        const sign = Math.sign((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]))
        if (lastSign && sign !== lastSign) reversals++
        lastSign = sign
      }
      expect(length).toBeGreaterThan(300)
      expect(reversals).toBeGreaterThanOrEqual(4)
      expect(track.checkpoints).toHaveLength(16)
      const finish = track.checkpoints.at(-1)!
      expect([finish.position[0], finish.position[2]]).toEqual([track.spawnPosition[0], track.spawnPosition[2]])
      for (let i = 0; i < track.boundaries.length; i++) {
        const [ax, az, bx, bz] = track.boundaries[i]
        for (let j = i + 1; j < track.boundaries.length; j++) {
          const [cx, cz, dx, dz] = track.boundaries[j]
          const side = (x: number, z: number, x1: number, z1: number, x2: number, z2: number) => (x2-x1)*(z-z1)-(z2-z1)*(x-x1)
          const crosses = side(cx,cz,ax,az,bx,bz)*side(dx,dz,ax,az,bx,bz) < -1e-8 && side(ax,az,cx,cz,dx,dz)*side(bx,bz,cx,cz,dx,dz) < -1e-8
          if (crosses) throw new Error(`Crossing road edges for seed ${seed}: ${i}, ${j}`)
        }
      }
    }
  })

  it('requires every sector before the shared start/finish counts as a lap', () => {
    const track = generateTrack({ version: 'technical-loop-v2', seed: 42170 })
    const state = createSimulationState(track)
    stepSimulation(state, 0, 0, track)
    expect(state.laps).toBe(0)
    expect(state.passedCheckpoints).toBe(0)
    for (const checkpoint of track.checkpoints) {
      state.x = checkpoint.position[0]
      state.z = checkpoint.position[2]
      stepSimulation(state, 0, 0, track)
    }
    expect(state.laps).toBe(1)
    expect(state.passedCheckpoints).toBe(16)
  })
})
