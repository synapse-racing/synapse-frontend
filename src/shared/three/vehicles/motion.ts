export interface VehiclePose {
  x: number
  z: number
  yaw: number
}

export function wheelMotion(
  previous: VehiclePose,
  current: VehiclePose,
  wheelbase: number,
  scale = 1,
) {
  const dx = current.x - previous.x,
    dz = current.z - previous.z
  const travel = Math.hypot(dx, dz) / scale
  if (travel < 0.0001 || travel > 6) return { distance: 0, steering: 0 }
  const turn = Math.atan2(
    Math.sin(current.yaw - previous.yaw),
    Math.cos(current.yaw - previous.yaw),
  )
  const heading = previous.yaw + turn / 2
  const direction =
    dx * -Math.sin(heading) + dz * -Math.cos(heading) < 0 ? -1 : 1
  const distance = travel * direction
  return {
    distance,
    steering: Math.max(
      -0.42,
      Math.min(0.42, Math.atan((wheelbase * turn) / distance)),
    ),
  }
}
