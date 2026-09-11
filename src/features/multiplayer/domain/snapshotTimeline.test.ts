import { describe, expect, it } from 'vitest'
import { SnapshotTimeline } from './snapshotTimeline.ts'
import type { RaceSnapshot } from '../types/multiplayer.ts'

function snapshot(time: number, x = time / 10, yaw = 0, startAt = 1): RaceSnapshot {
  return {
    serverTime: time, startAt, status: 'RACING',
    players: [{ userId: 'driver', username: 'Driver', x, z: -x, yaw,
      speed: 10, expectedCheckpoint: 0, passedCheckpoints: 0, laps: 0,
      finishedAt: null, disconnected: false, eliminated: false,
      eliminationReason: null, rank: 1 }],
  }
}

describe('snapshot timeline', () => {
  it('renders continuous movement between server ticks at 120 FPS despite jitter', () => {
    const timeline = new SnapshotTimeline()
    timeline.push(snapshot(1000), 0)
    timeline.push(snapshot(1050), 65)
    timeline.push(snapshot(1100), 95)
    timeline.push(snapshot(1150), 160)
    for (let frame = 0; frame <= 12; frame++) {
      const now = 100 + frame * 1000 / 120
      expect(timeline.sample('driver', now)?.x).toBeCloseTo((900 + now) / 10)
    }
  })

  it('turns across the angle boundary by the shortest arc', () => {
    const timeline = new SnapshotTimeline()
    timeline.push(snapshot(1000, 0, Math.PI - 0.1), 0)
    timeline.push(snapshot(1100, 10, -Math.PI + 0.1), 100)
    expect(timeline.sample('driver', 150)?.yaw).toBeCloseTo(Math.PI)
  })

  it('ignores duplicate and stale packets and freezes without inventing movement', () => {
    const timeline = new SnapshotTimeline()
    timeline.push(snapshot(1000), 0)
    timeline.push(snapshot(1100), 100)
    timeline.push(snapshot(1050, 999), 110)
    timeline.push(snapshot(1100, 999), 120)
    expect(timeline.sample('driver', 10000)?.x).toBe(110)
    expect(timeline.sample('missing', 10000)).toBeUndefined()
  })

  it('reaches the exact terminal pose and resets for a new race', () => {
    const timeline = new SnapshotTimeline()
    timeline.push(snapshot(1000), 0)
    const final = snapshot(1050)
    final.players[0].eliminated = true
    final.players[0].speed = 0
    timeline.push(final, 50)
    expect(timeline.sample('driver', 125)?.eliminated).toBe(false)
    expect(timeline.sample('driver', 150)).toEqual(final.players[0])
    timeline.push(snapshot(2000, 0, 0, 2), 1000)
    expect(timeline.sample('driver', 1000)?.x).toBe(0)
  })

  it('recovers the playback clock after a suspended tab', () => {
    const timeline = new SnapshotTimeline()
    timeline.push(snapshot(1000), 0)
    timeline.push(snapshot(2000), 5000)
    timeline.push(snapshot(2050), 5050)
    expect(timeline.sample('driver', 5125)?.x).toBeCloseTo(202.5)
  })
})
