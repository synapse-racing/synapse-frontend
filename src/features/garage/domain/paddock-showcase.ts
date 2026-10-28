export interface PaddockShotDefinition {
  name: string
  duration: number
  /** Initial camera position [x, y, z] */
  position: [number, number, number]
  /** Look-at target [x, y, z] */
  target: [number, number, number]
  fov: number
  /** Total drift delta [dx, dy, dz] over the full duration of the shot */
  drift: [number, number, number]
  /** Aesthetic steering angle for front wheels in radians */
  steerAngle: number
}

export const paddockShots: readonly PaddockShotDefinition[] = [
  {
    name: 'Hero 3/4 Frontal',
    duration: 6,
    position: [6.8, 1.85, -7.2],
    target: [0, 0.85, -0.4],
    fov: 40,
    drift: [-1.4, 0.35, 1.6],
    steerAngle: 0.24,
  },
  {
    name: 'Perfil Lateral Dinámico',
    duration: 6,
    position: [8.2, 1.45, -2.5],
    target: [0, 0.85, 0],
    fov: 36,
    drift: [-0.8, 0.25, 3.4],
    steerAngle: 0.08,
  },
  {
    name: 'Alerón y Difusor Trasero',
    duration: 6,
    position: [-5.6, 1.15, 6.6],
    target: [0, 0.9, 0.6],
    fov: 46,
    drift: [1.8, 0.65, -1.4],
    steerAngle: -0.16,
  },
  {
    name: 'Barrido Cenital',
    duration: 7,
    position: [8.5, 5.2, -8.5],
    target: [0, 0.8, 0],
    fov: 44,
    drift: [-2.8, -0.5, 2.4],
    steerAngle: 0,
  },
] as const

export const totalPaddockCycleDuration = paddockShots.reduce(
  (acc, shot) => acc + shot.duration,
  0,
)

export function paddockShot(time: number): {
  index: number
  progress: number
  shot: PaddockShotDefinition
} {
  const cycle =
    ((time % totalPaddockCycleDuration) + totalPaddockCycleDuration) %
    totalPaddockCycleDuration
  let remaining = cycle
  for (let i = 0; i < paddockShots.length; i++) {
    const shot = paddockShots[i]
    if (remaining < shot.duration) {
      return { index: i, progress: remaining / shot.duration, shot }
    }
    remaining -= shot.duration
  }
  return { index: 0, progress: 0, shot: paddockShots[0] }
}

export function paddockCarMotion(
  time: number,
  paused = false,
): {
  turntableAngle: number
  idleBounce: number
  idlePitch: number
  steerAngle: number
} {
  if (paused) {
    return {
      turntableAngle: 0,
      idleBounce: 0,
      idlePitch: 0,
      steerAngle: 0.12,
    }
  }

  // Noticeable turntable rotation: ~10.3 degrees / second
  const turntableAngle = time * 0.18

  // Engine idle suspension vibration
  const idleBounce =
    Math.sin(time * 26) * 0.0028 + Math.sin(time * 52) * 0.0012
  const idlePitch = Math.sin(time * 20) * 0.0018

  const shotInfo = paddockShot(time)
  const steerAngle = shotInfo.shot.steerAngle

  return { turntableAngle, idleBounce, idlePitch, steerAngle }
}
