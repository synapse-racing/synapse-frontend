export const simulationStepSeconds = 1 / 20
export const simulationMaxSeconds = 28

export interface SimulationState {
  x: number
  z: number
  yaw: number
  speed: number
  expectedCheckpoint: number
  passedCheckpoints: number
  laps: number
  insideCheckpoints: boolean[]
  traveledDistance: number
  elapsedSteps: number
  stationarySteps: number
  collided: boolean
}

export interface SimulationStep {
  checkpointEntries: number[]
  collision: boolean
  stalled: boolean
  finished: boolean
}

const sensorAngles = [-60, -30, 0, 30, 60].map(
  (degrees) => (degrees * Math.PI) / 180,
)
export function createSimulationState(
  track: TrackDefinition = prototypeTrack,
): SimulationState {
  const [x, , z] = track.spawnPosition
  return {
    x,
    z,
    yaw: track.spawnYaw,
    speed: 0,
    expectedCheckpoint: 0,
    passedCheckpoints: 0,
    laps: 0,
    insideCheckpoints: track.checkpoints.map(() => false),
    traveledDistance: 0,
    elapsedSteps: 0,
    stationarySteps: 0,
    collided: false,
  }
}

export function stepSimulation(
  state: SimulationState,
  steering: number,
  throttle: number,
  track: TrackDefinition = prototypeTrack,
): SimulationStep {
  state.speed += Math.max(-1, Math.min(1, throttle)) * 8.5 * simulationStepSeconds
  state.speed *= Math.pow(0.985, simulationStepSeconds * 60)
  state.speed = Math.max(-4.5, Math.min(12, state.speed))
  const speedFactor = Math.min(1, Math.abs(state.speed) / 6)
  const reverse = state.speed < 0 ? -1 : 1
  state.yaw +=
    Math.max(-1, Math.min(1, steering)) *
    reverse *
    speedFactor *
    1.9 *
    simulationStepSeconds

  const previousX = state.x
  const previousZ = state.z
  let collision = false
  state.x += -Math.sin(state.yaw) * state.speed * simulationStepSeconds
  state.z += -Math.cos(state.yaw) * state.speed * simulationStepSeconds
  if (!isDrivable(state.x, state.z, track)) {
    state.x = previousX
    state.z = previousZ
    state.speed *= -0.2
    state.collided = true
    collision = true
  }
  state.traveledDistance += Math.hypot(state.x - previousX, state.z - previousZ)

  const checkpointEntries: number[] = []
  track.checkpoints.forEach((checkpoint, index) => {
    const [checkpointX, , checkpointZ] = checkpoint.position
    const [width, , depth] = checkpoint.size
    const dx = state.x - checkpointX
    const dz = state.z - checkpointZ
    const cosine = Math.cos(checkpoint.rotationY)
    const sine = Math.sin(checkpoint.rotationY)
    const localX = cosine * dx - sine * dz
    const localZ = sine * dx + cosine * dz
    const inside =
      Math.abs(localX) <= width / 2 && Math.abs(localZ) <= depth / 2
    if (inside && !state.insideCheckpoints[index] && index === state.expectedCheckpoint) {
      checkpointEntries.push(index)
      state.passedCheckpoints += 1
      if (index === track.checkpoints.length - 1) {
        state.laps += 1
        state.expectedCheckpoint = 0
      } else {
        state.expectedCheckpoint += 1
      }
    }
    state.insideCheckpoints[index] = inside
  })

  state.elapsedSteps += 1
  state.stationarySteps = Math.abs(state.speed) < 0.35 ? state.stationarySteps + 1 : 0
  const elapsed = state.elapsedSteps * simulationStepSeconds
  const stalled = state.stationarySteps * simulationStepSeconds >= 3
  return {
    checkpointEntries,
    collision,
    stalled,
    finished:
      collision ||
      stalled ||
      state.laps >= 1 ||
      elapsed >= simulationMaxSeconds,
  }
}

export function senseSimulation(
  state: SimulationState,
  track: TrackDefinition = prototypeTrack,
): number[] {
  const originX = state.x - Math.sin(state.yaw) * 1.25
  const originZ = state.z - Math.cos(state.yaw) * 1.25
  return sensorAngles.map((angle) => {
    const directionX = -Math.sin(state.yaw - angle)
    const directionZ = -Math.cos(state.yaw - angle)
    let nearest = 8
    for (const [x1, z1, x2, z2] of track.boundaries) {
      const segmentX = x2 - x1
      const segmentZ = z2 - z1
      const denominator = directionX * segmentZ - directionZ * segmentX
      if (Math.abs(denominator) < 1e-9) continue
      const offsetX = x1 - originX
      const offsetZ = z1 - originZ
      const distance = (offsetX * segmentZ - offsetZ * segmentX) / denominator
      const position = (offsetX * directionZ - offsetZ * directionX) / denominator
      if (distance >= 0 && position >= 0 && position <= 1) {
        nearest = Math.min(nearest, distance)
      }
    }
    return Math.min(1, nearest / 8)
  })
}

export function isDrivable(
  x: number,
  z: number,
  track: TrackDefinition = prototypeTrack,
): boolean {
  if (track.geometry.kind === 'rectangular-ring') {
    const { outerX, outerZ, innerX, innerZ } = track.geometry
    return (
      Math.abs(x) < outerX &&
      Math.abs(z) < outerZ &&
      (Math.abs(x) > innerX || Math.abs(z) > innerZ)
    )
  }
  const { centerline, driveHalfWidth } = track.geometry
  return centerline.some((start, index) => {
    const end = centerline[(index + 1) % centerline.length]
    const segmentX = end[0] - start[0]
    const segmentZ = end[1] - start[1]
    const lengthSquared = segmentX * segmentX + segmentZ * segmentZ
    const projection = Math.max(
      0,
      Math.min(
        1,
        ((x - start[0]) * segmentX + (z - start[1]) * segmentZ) /
          lengthSquared,
      ),
    )
    return (
      Math.hypot(
        x - (start[0] + segmentX * projection),
        z - (start[1] + segmentZ * projection),
      ) < driveHalfWidth
    )
  })
}
import { prototypeTrack, type TrackDefinition } from '../domain/track.ts'
