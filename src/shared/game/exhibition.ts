import type { TrackDefinition } from '../../features/training/domain/track.ts'

export const exhibitionShots = [
  { name: 'Vuelta de reconocimiento', duration: 8 },
  { name: 'A la estela', duration: 8 },
  { name: 'A pie de pista', duration: 7 },
  { name: 'Rueda a rueda', duration: 8 },
  { name: 'La siguiente curva', duration: 9 },
] as const

export function exhibitionShot(time: number) {
  let remaining = ((time % 40) + 40) % 40
  for (const [index, shot] of exhibitionShots.entries()) {
    if (remaining < shot.duration) return { index, progress: remaining / shot.duration, ...shot }
    remaining -= shot.duration
  }
  return { index: 0, progress: 0, ...exhibitionShots[0] }
}

export function createExhibitionPath(track: TrackDefinition) {
  if (track.geometry.kind !== 'centerline-loop') throw new Error('Exhibition requires a closed circuit')
  const points = track.geometry.centerline
  const distances = [0]
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length]
    distances.push(distances[i] + Math.hypot(next[0] - points[i][0], next[1] - points[i][1]))
  }
  const length = distances.at(-1)!
  function point(distance: number) {
    const wrapped = ((distance % length) + length) % length
    let low = 0, high = points.length - 1
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      if (distances[mid] <= wrapped) low = mid
      else high = mid - 1
    }
    const a = points[low], b = points[(low + 1) % points.length]
    const t = (wrapped - distances[low]) / (distances[low + 1] - distances[low])
    return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t }
  }
  function pose(distance: number, lane = 0) {
    const center = point(distance), before = point(distance - 0.8), after = point(distance + 0.8)
    const yaw = Math.atan2(-(after.x - before.x), -(after.z - before.z))
    return { x: center.x + Math.cos(yaw) * lane, z: center.z - Math.sin(yaw) * lane, yaw }
  }
  // A time-to-distance table makes the pack brake through bends and accelerate on straights.
  const route = [{ time: 0, distance: 0 }]
  for (let distance = 1; distance <= Math.ceil(length); distance++) {
    const d = Math.min(distance, length)
    const a = pose(d - 3), b = pose(d + 3)
    const bend = Math.abs(Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw)))
    const speed = 13 - Math.min(1, bend / 0.65) * 6
    route.push({ time: route.at(-1)!.time + (d - route.at(-1)!.distance) / speed, distance: d })
  }
  const lapSeconds = route.at(-1)!.time
  function distanceAt(time: number) {
    const t = ((time % lapSeconds) + lapSeconds) % lapSeconds
    let low = 0, high = route.length - 2
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      if (route[mid].time <= t) low = mid
      else high = mid - 1
    }
    const a = route[low], b = route[low + 1]
    return a.distance + (b.distance - a.distance) * (t - a.time) / (b.time - a.time)
  }
  return { length, pose, distanceAt }
}

export type ExhibitionPath = ReturnType<typeof createExhibitionPath>

export function exhibitionCar(path: ExhibitionPath, time: number, index: number) {
  const lane = [-1.8, -0.6, 0.6, 1.8][index]
  const distance = path.distanceAt(time + 12) - index * 3.4 + Math.sin(time * 0.24 + index * 1.8) * 4
  const speed = Math.abs(path.distanceAt(time + 12.02) - path.distanceAt(time + 12)) / 0.02
  return { ...path.pose(distance, lane), distance, speed: Math.min(speed, 16) }
}
