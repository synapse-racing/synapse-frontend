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
  finished: boolean
}

const checkpoints = [
  { x: -10, z: 0, halfWidth: 3.7, halfDepth: 0.5 },
  { x: 0, z: -20, halfWidth: 0.5, halfDepth: 3.7 },
  { x: 10, z: 0, halfWidth: 3.7, halfDepth: 0.5 },
  { x: 0, z: 20, halfWidth: 0.5, halfDepth: 3.7 },
]
const sensorAngles = [-60, -30, 0, 30, 60].map(
  (degrees) => (degrees * Math.PI) / 180,
)
const boundaries = [
  [-13.35, -23.35, -13.35, 23.35],
  [13.35, -23.35, 13.35, 23.35],
  [-13.35, -23.35, 13.35, -23.35],
  [-13.35, 23.35, 13.35, 23.35],
  [-6.65, -16.65, -6.65, 16.65],
  [6.65, -16.65, 6.65, 16.65],
  [-6.65, -16.65, 6.65, -16.65],
  [-6.65, 16.65, 6.65, 16.65],
] as const

export function createSimulationState(x = -10, z = 13, yaw = 0): SimulationState {
  return {
    x,
    z,
    yaw,
    speed: 0,
    expectedCheckpoint: 0,
    passedCheckpoints: 0,
    laps: 0,
    insideCheckpoints: checkpoints.map(() => false),
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
  if (!isDrivable(state.x, state.z)) {
    state.x = previousX
    state.z = previousZ
    state.speed *= -0.2
    state.collided = true
    collision = true
  }
  state.traveledDistance += Math.hypot(state.x - previousX, state.z - previousZ)

  const checkpointEntries: number[] = []
  checkpoints.forEach((checkpoint, index) => {
    const inside =
      Math.abs(state.x - checkpoint.x) <= checkpoint.halfWidth &&
      Math.abs(state.z - checkpoint.z) <= checkpoint.halfDepth
    if (inside && !state.insideCheckpoints[index] && index === state.expectedCheckpoint) {
      checkpointEntries.push(index)
      state.passedCheckpoints += 1
      if (index === checkpoints.length - 1) {
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
  return {
    checkpointEntries,
    collision,
    finished:
      collision ||
      state.laps >= 1 ||
      elapsed >= simulationMaxSeconds,
  }
}

export function senseSimulation(state: SimulationState): number[] {
  const originX = state.x - Math.sin(state.yaw) * 1.25
  const originZ = state.z - Math.cos(state.yaw) * 1.25
  return sensorAngles.map((angle) => {
    const directionX = -Math.sin(state.yaw - angle)
    const directionZ = -Math.cos(state.yaw - angle)
    let nearest = 8
    for (const [x1, z1, x2, z2] of boundaries) {
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

export function isDrivable(x: number, z: number): boolean {
  return (
    Math.abs(x) < 13.35 &&
    Math.abs(z) < 23.35 &&
    (Math.abs(x) > 6.65 || Math.abs(z) > 16.65)
  )
}
