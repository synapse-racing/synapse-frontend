export type Vector3Tuple = [number, number, number]
export type BoundarySegment = readonly [number, number, number, number]

export interface TrackRecipe {
  version: 'rectangular-ring-v1' | 'curved-loop-v1'
  seed: number
}

export type TrackGeometry =
  | {
      kind: 'rectangular-ring'
      outerX: number
      outerZ: number
      innerX: number
      innerZ: number
    }
  | {
      kind: 'centerline-loop'
      centerline: Array<readonly [number, number]>
      driveHalfWidth: number
    }

export interface WallDefinition {
  id: string
  position: Vector3Tuple
  rotationY: number
  size: Vector3Tuple
}

export interface CheckpointDefinition {
  id: string
  index: number
  position: Vector3Tuple
  rotationY: number
  size: Vector3Tuple
}

export interface TrackDefinition {
  recipe: TrackRecipe
  name: string
  groundSize: [number, number]
  spawnPosition: Vector3Tuple
  spawnYaw: number
  geometry: TrackGeometry
  boundaries: BoundarySegment[]
  walls: WallDefinition[]
  checkpoints: CheckpointDefinition[]
}

function randomValues(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
}

function halfStep(random: () => number, minimum: number, maximum: number) {
  return Math.round((minimum + random() * (maximum - minimum)) * 2) / 2
}

function segmentWall(
  id: string,
  start: readonly [number, number],
  end: readonly [number, number],
): WallDefinition {
  const dx = end[0] - start[0]
  const dz = end[1] - start[1]
  return {
    id,
    position: [(start[0] + end[0]) / 2, 0.7, (start[1] + end[1]) / 2],
    rotationY: Math.atan2(-dz, dx),
    size: [Math.hypot(dx, dz) + 0.08, 1.4, 0.6],
  }
}

function generateCurvedTrack(recipe: TrackRecipe): TrackDefinition {
  const random = randomValues(recipe.seed)
  const radiusX = halfStep(random, 14, 19)
  const radiusZ = halfStep(random, 17, 24)
  const driveHalfWidth = halfStep(random, 3.25, 4.25)
  const waveTwo = 0.06 + random() * 0.08
  const waveThree = 0.04 + random() * 0.07
  const phaseTwo = random() * Math.PI * 2
  const phaseThree = random() * Math.PI * 2
  const sampleCount = 72

  const pointAt = (angle: number): readonly [number, number] => {
    const radius =
      1 +
      waveTwo * Math.sin(angle * 2 + phaseTwo) +
      waveThree * Math.sin(angle * 3 + phaseThree)
    return [radiusX * radius * Math.cos(angle), radiusZ * radius * Math.sin(angle)]
  }
  const tangentAt = (angle: number): readonly [number, number] => {
    const before = pointAt(angle - 0.001)
    const after = pointAt(angle + 0.001)
    const dx = after[0] - before[0]
    const dz = after[1] - before[1]
    const length = Math.hypot(dx, dz)
    return [dx / length, dz / length]
  }

  const centerline = Array.from({ length: sampleCount }, (_, index) =>
    pointAt((index / sampleCount) * Math.PI * 2),
  )
  const left: Array<readonly [number, number]> = []
  const right: Array<readonly [number, number]> = []
  centerline.forEach((point, index) => {
    const previous = centerline[(index - 1 + sampleCount) % sampleCount]
    const next = centerline[(index + 1) % sampleCount]
    const tangentX = next[0] - previous[0]
    const tangentZ = next[1] - previous[1]
    const length = Math.hypot(tangentX, tangentZ)
    const normalX = -tangentZ / length
    const normalZ = tangentX / length
    left.push([
      point[0] + normalX * driveHalfWidth,
      point[1] + normalZ * driveHalfWidth,
    ])
    right.push([
      point[0] - normalX * driveHalfWidth,
      point[1] - normalZ * driveHalfWidth,
    ])
  })

  const boundaries: BoundarySegment[] = []
  const walls: WallDefinition[] = []
  for (let index = 0; index < sampleCount; index += 1) {
    const next = (index + 1) % sampleCount
    boundaries.push([left[index][0], left[index][1], left[next][0], left[next][1]])
    boundaries.push([
      right[index][0],
      right[index][1],
      right[next][0],
      right[next][1],
    ])
    walls.push(segmentWall(`left-${index}`, left[index], left[next]))
    walls.push(segmentWall(`right-${index}`, right[index], right[next]))
  }

  const checkpointAngles = [Math.PI, Math.PI * 1.5, 0, Math.PI * 0.5]
  const checkpoints = checkpointAngles.map((angle, index) => {
    const point = pointAt(angle)
    const tangent = tangentAt(angle)
    const normalX = -tangent[1]
    const normalZ = tangent[0]
    return {
      id: `sector-${index}`,
      index,
      position: [point[0], 0.35, point[1]] as Vector3Tuple,
      rotationY: Math.atan2(-normalZ, normalX),
      size: [driveHalfWidth * 2 - 0.5, 0.7, 1] as Vector3Tuple,
    }
  })
  const spawnAngle = Math.PI - 0.35
  const spawn = pointAt(spawnAngle)
  const spawnTangent = tangentAt(spawnAngle)
  const extentX = Math.max(...left.map(([x]) => Math.abs(x)), ...right.map(([x]) => Math.abs(x)))
  const extentZ = Math.max(...left.map(([, z]) => Math.abs(z)), ...right.map(([, z]) => Math.abs(z)))

  return {
    recipe: { ...recipe },
    name: `Circuito Curvas ${String(recipe.seed).padStart(6, '0')}`,
    groundSize: [Math.ceil((extentX + 3) * 2), Math.ceil((extentZ + 3) * 2)],
    spawnPosition: [spawn[0], 0.65, spawn[1]],
    spawnYaw: Math.atan2(-spawnTangent[0], -spawnTangent[1]),
    geometry: { kind: 'centerline-loop', centerline, driveHalfWidth },
    boundaries,
    walls,
    checkpoints,
  }
}

function generateRectangularTrack(recipe: TrackRecipe): TrackDefinition {
  const outerHalfWidth = 14
  const outerHalfDepth = 24
  const innerHalfWidth = 6
  const innerHalfDepth = 16
  const laneX = 10
  const laneZ = 20
  const geometry = {
    kind: 'rectangular-ring' as const,
    outerX: 13.35,
    outerZ: 23.35,
    innerX: 6.65,
    innerZ: 16.65,
  }
  const { outerX, outerZ, innerX, innerZ } = geometry
  return {
    recipe: { ...recipe },
    name: `Circuito Clasico ${String(recipe.seed).padStart(6, '0')}`,
    groundSize: [28, 48],
    spawnPosition: [-10, 0.65, 13],
    spawnYaw: 0,
    geometry,
    boundaries: [
      [-outerX, -outerZ, -outerX, outerZ],
      [outerX, -outerZ, outerX, outerZ],
      [-outerX, -outerZ, outerX, -outerZ],
      [-outerX, outerZ, outerX, outerZ],
      [-innerX, -innerZ, -innerX, innerZ],
      [innerX, -innerZ, innerX, innerZ],
      [-innerX, -innerZ, innerX, -innerZ],
      [-innerX, innerZ, innerX, innerZ],
    ],
    walls: [
      { id: 'outer-north', position: [0, 0.7, -outerHalfDepth], rotationY: 0, size: [28, 1.4, 0.6] },
      { id: 'outer-south', position: [0, 0.7, outerHalfDepth], rotationY: 0, size: [28, 1.4, 0.6] },
      { id: 'outer-west', position: [-outerHalfWidth, 0.7, 0], rotationY: 0, size: [0.6, 1.4, 48] },
      { id: 'outer-east', position: [outerHalfWidth, 0.7, 0], rotationY: 0, size: [0.6, 1.4, 48] },
      { id: 'inner-north', position: [0, 0.7, -innerHalfDepth], rotationY: 0, size: [12, 1.4, 0.6] },
      { id: 'inner-south', position: [0, 0.7, innerHalfDepth], rotationY: 0, size: [12, 1.4, 0.6] },
      { id: 'inner-west', position: [-innerHalfWidth, 0.7, 0], rotationY: 0, size: [0.6, 1.4, 32] },
      { id: 'inner-east', position: [innerHalfWidth, 0.7, 0], rotationY: 0, size: [0.6, 1.4, 32] },
    ],
    checkpoints: [
      { id: 'sector-west', index: 0, position: [-laneX, 0.35, 0], rotationY: 0, size: [7.4, 0.7, 1] },
      { id: 'sector-north', index: 1, position: [0, 0.35, -laneZ], rotationY: Math.PI / 2, size: [7.4, 0.7, 1] },
      { id: 'sector-east', index: 2, position: [laneX, 0.35, 0], rotationY: 0, size: [7.4, 0.7, 1] },
      { id: 'sector-south', index: 3, position: [0, 0.35, laneZ], rotationY: Math.PI / 2, size: [7.4, 0.7, 1] },
    ],
  }
}

export function generateTrack(recipe: TrackRecipe): TrackDefinition {
  return recipe.version === 'rectangular-ring-v1'
    ? generateRectangularTrack(recipe)
    : generateCurvedTrack(recipe)
}

export const prototypeTrack = generateTrack({
  version: 'rectangular-ring-v1',
  seed: 42_170,
})

export const defaultTrackRecipe: TrackRecipe = {
  version: 'curved-loop-v1',
  seed: 42_170,
}
