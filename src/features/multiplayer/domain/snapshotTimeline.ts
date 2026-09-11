import type { RacePlayerState, RaceSnapshot } from '../types/multiplayer.ts'

// Two server ticks absorb normal packet jitter without predicting collisions.
const BUFFER_MS = 100

export class SnapshotTimeline {
  private snapshots: RaceSnapshot[] = []
  private offset = 0
  private raceId: number | undefined

  push(snapshot: RaceSnapshot, receivedAt: number) {
    if (this.raceId !== snapshot.startAt) {
      this.snapshots = []
      this.raceId = snapshot.startAt
    }
    const latest = this.snapshots.at(-1)
    if (latest && snapshot.serverTime <= latest.serverTime) return
    if (!latest || receivedAt - this.offset - snapshot.serverTime > 250) {
      this.offset = receivedAt - snapshot.serverTime
    }
    this.snapshots.push(snapshot)
    if (this.snapshots.length > 60) this.snapshots.shift()
  }

  sample(userId: string, now: number): RacePlayerState | undefined {
    const time = now - this.offset - BUFFER_MS
    while (this.snapshots.length > 2 && this.snapshots[1].serverTime <= time) {
      this.snapshots.shift()
    }
    const first = this.snapshots[0]
    if (!first) return undefined
    const next = this.snapshots[1]
    const from = first.players.find((player) => player.userId === userId)
    if (!next || time <= first.serverTime) return from
    const to = next.players.find((player) => player.userId === userId)
    if (!from || !to || time >= next.serverTime) return to ?? from
    const alpha = (time - first.serverTime) / (next.serverTime - first.serverTime)
    const angle = Math.atan2(Math.sin(to.yaw - from.yaw), Math.cos(to.yaw - from.yaw))
    return {
      ...from,
      x: from.x + (to.x - from.x) * alpha,
      z: from.z + (to.z - from.z) * alpha,
      yaw: from.yaw + angle * alpha,
      speed: from.speed + (to.speed - from.speed) * alpha,
    }
  }
}
