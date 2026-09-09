import {
  BufferGeometry,
  Float32BufferAttribute,
  Path,
  Shape,
  ShapeGeometry,
} from 'three'
import type { TrackDefinition } from '../../features/training/domain/track.ts'

export function createRoadGeometry(track: TrackDefinition) {
  if (track.geometry.kind === 'rectangular-ring') {
    const { outerX, outerZ, innerX, innerZ } = track.geometry
    const shape = new Shape()
      .moveTo(-outerX, -outerZ)
      .lineTo(outerX, -outerZ)
      .lineTo(outerX, outerZ)
      .lineTo(-outerX, outerZ)
      .closePath()
    shape.holes.push(
      new Path()
        .moveTo(-innerX, -innerZ)
        .lineTo(-innerX, innerZ)
        .lineTo(innerX, innerZ)
        .lineTo(innerX, -innerZ)
        .closePath(),
    )
    const geometry = new ShapeGeometry(shape)
    geometry.rotateX(-Math.PI / 2)
    addRoadUVs(geometry)
    return geometry
  }
  const vertices: number[] = [],
    indices: number[] = []
  const count = track.boundaries.length / 2
  for (let i = 0; i < count; i++) {
    const left = track.boundaries[i * 2],
      right = track.boundaries[i * 2 + 1]
    vertices.push(left[0], 0, left[1], right[0], 0, right[1])
    const a = i * 2,
      b = ((i + 1) % count) * 2
    indices.push(a, b, a + 1, a + 1, b, b + 1)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  addRoadUVs(geometry)
  return geometry
}

function addRoadUVs(geometry: BufferGeometry) {
  const position = geometry.getAttribute('position')
  const uv: number[] = []
  for (let index = 0; index < position.count; index++)
    uv.push(position.getX(index) / 8, position.getZ(index) / 8)
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
}

export function trackExtent(track: TrackDefinition) {
  return {
    x: Math.max(
      ...track.boundaries.flatMap((b) => [Math.abs(b[0]), Math.abs(b[2])]),
    ),
    z: Math.max(
      ...track.boundaries.flatMap((b) => [Math.abs(b[1]), Math.abs(b[3])]),
    ),
  }
}
