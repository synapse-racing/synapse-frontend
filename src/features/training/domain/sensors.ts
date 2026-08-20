export const sensorAngles = [-60, -30, 0, 30, 60] as const
export const sensorMaxDistance = 8

export function sensorDirection(angleDegrees: number): [number, number, number] {
  const angle = (angleDegrees * Math.PI) / 180
  return [Math.sin(angle), 0, -Math.cos(angle)]
}

export function normalizeSensorDistance(
  distance: number | null,
  maxDistance = sensorMaxDistance,
): number {
  if (distance === null) return 1
  if (maxDistance <= 0) throw new Error('maxDistance must be positive')
  return Math.min(1, Math.max(0, distance / maxDistance))
}
