import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Box3,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { VehicleAppearance } from '../../../features/garage/domain/appearance.ts'

export type BodyPart =
  | 'left'
  | 'right'
  | 'accent'
  | 'stripe'
  | 'glass'
  | 'carbon'
  | 'metal'
  | 'lights'
  | 'rearLights'
type Position = [number, number, number]
type Section = [z: number, halfWidth: number, bottom: number, top: number]
type Parts = Partial<Record<BodyPart, BufferGeometry[]>>
export interface CarGeometry {
  body: Partial<Record<BodyPart, BufferGeometry>>
  wheelPositions: Position[]
  numberPosition: Position
  numberScale: number
  scale: number
}

const catalogGeometry = new Map<VehicleAppearance['modelId'], CarGeometry>()

function add(parts: Parts, name: BodyPart, geometry: BufferGeometry) {
  ;(parts[name] ??= []).push(geometry)
}

function box(
  parts: Parts,
  name: BodyPart,
  size: Position,
  position: Position,
  rotation: Position = [0, 0, 0],
) {
  const geometry = new BoxGeometry(...size)
  geometry
    .rotateX(rotation[0])
    .rotateY(rotation[1])
    .rotateZ(rotation[2])
    .translate(...position)
  add(parts, name, geometry)
}

function polyhedron(vertices: Position[], faces: number[][]) {
  const positions: number[] = []
  const center = new Vector3()
  vertices.forEach((v) => center.add(new Vector3(...v)))
  center.divideScalar(vertices.length)
  for (const face of faces) {
    const points = face.map((index) => new Vector3(...vertices[index]))
    const normal = points[1]
      .clone()
      .sub(points[0])
      .cross(points[2].clone().sub(points[0]))
    const faceCenter = points
      .reduce((sum, point) => sum.add(point), new Vector3())
      .divideScalar(points.length)
    if (normal.dot(faceCenter.sub(center)) < 0) points.reverse()
    for (let i = 1; i < points.length - 1; i++) {
      for (const point of [points[0], points[i], points[i + 1]])
        positions.push(point.x, point.y, point.z)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

function loft(sections: Section[], side: -1 | 1, innerWidth = 0) {
  const pieces: BufferGeometry[] = []
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i],
      b = sections[i + 1]
    const vertices: Position[] = [a, b].flatMap(
      ([z, width, bottom, top]) =>
        [
          [side * innerWidth, bottom, z],
          [side * width, bottom, z],
          [side * width, top, z],
          [side * innerWidth, top, z],
        ] as Position[],
    )
    pieces.push(
      polyhedron(vertices, [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [0, 4, 5, 1],
        [1, 5, 6, 2],
        [2, 6, 7, 3],
        [3, 7, 4, 0],
      ]),
    )
  }
  const merged = mergeGeometries(pieces)!
  pieces.forEach((piece) => piece.dispose())
  return merged
}

function shell(parts: Parts, sections: Section[]) {
  add(parts, 'left', loft(sections, -1))
  add(parts, 'right', loft(sections, 1))
}

function stripe(parts: Parts, sections: Section[], width = 0.075) {
  const stripeSections: Section[] = sections.map(([z, , , top]) => [
    z,
    width,
    top + 0.002,
    top + 0.006,
  ])
  add(parts, 'stripe', loft(stripeSections, -1))
  add(parts, 'stripe', loft(stripeSections, 1))
}

function frontLights(
  parts: Parts,
  x: number,
  y: number,
  z: number,
  width: number,
) {
  for (const side of [-1, 1]) {
    box(parts, 'carbon', [width + 0.035, 0.09, 0.022], [side * x, y, z])
    box(
      parts,
      'lights',
      [width, 0.034, 0.028],
      [side * x, y + 0.015, z - 0.008],
    )
    box(
      parts,
      'lights',
      [width * 0.72, 0.014, 0.028],
      [side * x, y - 0.025, z - 0.008],
    )
  }
}

function wing(parts: Parts, y: number, z: number, width: number) {
  box(parts, 'carbon', [width, 0.035, 0.23], [0, y, z], [-0.06, 0, 0])
  box(parts, 'accent', [width, 0.018, 0.055], [0, y + 0.026, z + 0.07])
  for (const side of [-1, 1]) {
    box(
      parts,
      'carbon',
      [0.035, 0.25, 0.07],
      [side * width * 0.26, y - 0.13, z - 0.02],
    )
    box(parts, 'accent', [0.022, 0.12, 0.27], [(side * width) / 2, y + 0.02, z])
  }
}

function buildFormula(
  parts: Parts,
): Pick<CarGeometry, 'numberPosition' | 'numberScale'> {
  const body: Section[] = [
    [-1.12, 0.12, 0.18, 0.26],
    [-0.61, 0.16, 0.19, 0.36],
    [-0.13, 0.28, 0.18, 0.44],
    [0.35, 0.31, 0.17, 0.4],
    [0.82, 0.24, 0.19, 0.35],
    [1.08, 0.15, 0.19, 0.25],
  ]
  shell(parts, body)
  stripe(parts, body)
  for (const side of [-1, 1] as const) {
    box(
      parts,
      side < 0 ? 'left' : 'right',
      [0.3, 0.22, 0.74],
      [side * 0.32, 0.28, 0.22],
      [0, side * 0.03, 0],
    )
    box(parts, 'carbon', [0.23, 0.08, 0.026], [side * 0.32, 0.32, -0.16])
    box(parts, 'accent', [0.028, 0.055, 0.64], [side * 0.48, 0.23, 0.2])
    for (const z of [-0.73, 0.73]) {
      box(
        parts,
        'carbon',
        [0.6, 0.027, 0.032],
        [side * 0.25, 0.24, z],
        [0, side * 0.14, 0],
      )
      box(
        parts,
        'metal',
        [0.44, 0.018, 0.024],
        [side * 0.3, 0.31, z - 0.04],
        [0, -side * 0.2, 0],
      )
    }
    box(
      parts,
      'carbon',
      [0.038, 0.025, 0.16],
      [side * 0.27, 0.49, -0.1],
      [0, side * 0.3, 0],
    )
    box(parts, 'accent', [0.1, 0.055, 0.1], [side * 0.31, 0.51, -0.17])
    box(parts, 'accent', [0.025, 0.13, 0.23], [side * 0.55, 0.2, -1.08])
  }
  box(parts, 'carbon', [1.12, 0.035, 0.22], [0, 0.15, -1.08])
  box(parts, 'accent', [0.95, 0.025, 0.075], [0, 0.19, -1.04], [-0.12, 0, 0])
  box(parts, 'carbon', [0.27, 0.04, 0.37], [0, 0.43, 0.08])
  const helmet = new SphereGeometry(0.095, 10, 7)
    .scale(1, 0.88, 1.1)
    .translate(0, 0.51, 0.12)
  add(parts, 'glass', helmet)
  const hoop = new TorusGeometry(0.13, 0.026, 5, 12, Math.PI).translate(
    0,
    0.49,
    0.29,
  )
  add(parts, 'carbon', hoop)
  box(parts, 'rearLights', [0.08, 0.055, 0.022], [0, 0.23, 1.14])
  wing(parts, 0.58, 1.055, 1.03)
  return { numberPosition: [0, 0.373, -0.6], numberScale: 0.78 }
}

function buildGt(
  parts: Parts,
): Pick<CarGeometry, 'numberPosition' | 'numberScale'> {
  const body: Section[] = [
    [-1.14, 0.44, 0.2, 0.4],
    [-0.94, 0.54, 0.19, 0.48],
    [-0.45, 0.55, 0.2, 0.51],
    [0.57, 0.55, 0.2, 0.51],
    [1.14, 0.49, 0.21, 0.43],
  ]
  shell(parts, body)
  stripe(parts, body)
  const cabin: Section[] = [
    [-0.46, 0.4, 0.49, 0.51],
    [-0.12, 0.32, 0.49, 0.83],
    [0.43, 0.32, 0.49, 0.82],
    [0.76, 0.4, 0.49, 0.51],
  ]
  add(parts, 'glass', loft(cabin, -1))
  add(parts, 'glass', loft(cabin, 1))
  shell(parts, [
    [-0.13, 0.33, 0.826, 0.85],
    [0.44, 0.33, 0.816, 0.84],
  ])
  stripe(parts, [
    [-0.13, 0.33, 0.826, 0.85],
    [0.44, 0.33, 0.816, 0.84],
  ])
  frontLights(parts, 0.32, 0.405, -1.153, 0.25)
  box(parts, 'carbon', [0.67, 0.105, 0.035], [0, 0.29, -1.16])
  box(parts, 'carbon', [1.08, 0.035, 0.16], [0, 0.185, -1.105])
  box(parts, 'carbon', [0.82, 0.075, 0.12], [0, 0.22, 1.12])
  for (const side of [-1, 1]) {
    box(parts, 'accent', [0.035, 0.065, 1.1], [side * 0.55, 0.235, 0.02])
    box(parts, 'carbon', [0.025, 0.12, 0.035], [side * 0.33, 0.68, 0.12])
    box(parts, 'accent', [0.14, 0.065, 0.09], [side * 0.48, 0.58, -0.32])
    box(parts, 'metal', [0.025, 0.018, 0.1], [side * 0.56, 0.48, 0.21])
    box(parts, 'rearLights', [0.28, 0.046, 0.025], [side * 0.29, 0.4, 1.155])
    for (let slot = 0; slot < 3; slot++)
      box(
        parts,
        'carbon',
        [0.2, 0.012, 0.025],
        [side * 0.34, 0.515, -0.59 + slot * 0.055],
      )
  }
  wing(parts, 0.68, 1.04, 1.02)
  return { numberPosition: [0, 0.509, -0.71], numberScale: 1 }
}

function buildPrototype(
  parts: Parts,
): Pick<CarGeometry, 'numberPosition' | 'numberScale'> {
  const body: Section[] = [
    [-1.18, 0.44, 0.17, 0.24],
    [-0.98, 0.56, 0.16, 0.35],
    [-0.48, 0.55, 0.17, 0.43],
    [0.36, 0.53, 0.17, 0.4],
    [1.15, 0.51, 0.17, 0.3],
  ]
  shell(parts, body)
  stripe(parts, body, 0.095)
  const canopy: Section[] = [
    [-0.51, 0.27, 0.4, 0.41],
    [-0.17, 0.25, 0.4, 0.65],
    [0.3, 0.23, 0.37, 0.64],
    [0.63, 0.2, 0.37, 0.39],
  ]
  add(parts, 'glass', loft(canopy, -1))
  add(parts, 'glass', loft(canopy, 1))
  shell(parts, [
    [-0.17, 0.11, 0.65, 0.67],
    [0.31, 0.1, 0.64, 0.66],
  ])
  stripe(
    parts,
    [
      [-0.17, 0.11, 0.65, 0.67],
      [0.31, 0.1, 0.64, 0.66],
    ],
    0.035,
  )
  box(parts, 'carbon', [1.08, 0.026, 0.18], [0, 0.145, -1.11])
  frontLights(parts, 0.42, 0.275, -1.13, 0.13)
  for (const side of [-1, 1]) {
    box(parts, 'accent', [0.035, 0.05, 1.08], [side * 0.55, 0.19, -0.05])
    box(parts, 'carbon', [0.025, 0.1, 0.26], [side * 0.535, 0.3, 0.29])
    box(
      parts,
      'accent',
      [0.16, 0.023, 0.26],
      [side * 0.45, 0.24, -1.04],
      [0.13, side * 0.1, 0],
    )
    box(parts, 'accent', [0.11, 0.045, 0.09], [side * 0.35, 0.55, -0.25])
    box(parts, 'carbon', [0.025, 0.13, 0.025], [side * 0.32, 0.49, -0.24])
    box(parts, 'rearLights', [0.22, 0.028, 0.026], [side * 0.32, 0.29, 1.16])
    for (let slot = 0; slot < 4; slot++)
      box(
        parts,
        'carbon',
        [0.17, 0.009, 0.022],
        [side * 0.39, 0.43, -0.57 + slot * 0.045],
      )
  }
  add(
    parts,
    'accent',
    polyhedron(
      [
        [-0.012, 0.4, 0.32],
        [0.012, 0.4, 0.32],
        [-0.012, 0.65, 0.32],
        [0.012, 0.65, 0.32],
        [-0.012, 0.3, 1.0],
        [0.012, 0.3, 1.0],
        [-0.012, 0.58, 1.0],
        [0.012, 0.58, 1.0],
      ],
      [
        [0, 1, 3, 2],
        [4, 5, 7, 6],
        [0, 2, 6, 4],
        [1, 3, 7, 5],
        [2, 3, 7, 6],
        [0, 1, 5, 4],
      ],
    ),
  )
  wing(parts, 0.64, 1.035, 1.13)
  return { numberPosition: [0, 0.401, -0.72], numberScale: 0.92 }
}

export function getCarGeometry(
  modelId: VehicleAppearance['modelId'],
): CarGeometry {
  const cached = catalogGeometry.get(modelId)
  if (cached) return cached
  const parts: Parts = {}
  const decoration =
    modelId === 'gt'
      ? buildGt(parts)
      : modelId === 'prototype'
        ? buildPrototype(parts)
        : buildFormula(parts)
  const body: CarGeometry['body'] = {}
  for (const [name, pieces] of Object.entries(parts)) {
    const compatible = pieces.map((piece) => {
      const geometry = piece.index ? piece.toNonIndexed() : piece
      geometry.deleteAttribute('uv')
      return geometry
    })
    const geometry = mergeGeometries(compatible)!
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    body[name as BodyPart] = geometry
    new Set([...pieces, ...compatible]).forEach((piece) => piece.dispose())
  }
  const wheelX = modelId === 'formula' ? 0.53 : 0.49
  const bounds = new Box3()
  Object.values(body).forEach((geometry) => bounds.union(geometry.boundingBox!))
  const result: CarGeometry = {
    body,
    ...decoration,
    scale: 2.4 / bounds.getSize(new Vector3()).z,
    wheelPositions: [
      [-wheelX, 0.255, -0.73],
      [wheelX, 0.255, -0.73],
      [-wheelX, 0.255, 0.73],
      [wheelX, 0.255, 0.73],
    ],
  }
  catalogGeometry.set(modelId, result)
  return result
}

export const tireGeometry = new CylinderGeometry(0.23, 0.23, 0.19, 16).rotateZ(
  Math.PI / 2,
)
export const rimGeometry = (() => {
  const pieces: BufferGeometry[] = [
    new TorusGeometry(0.15, 0.018, 5, 16)
      .rotateY(Math.PI / 2)
      .translate(-0.098, 0, 0),
    new TorusGeometry(0.15, 0.018, 5, 16)
      .rotateY(Math.PI / 2)
      .translate(0.098, 0, 0),
    new CylinderGeometry(0.046, 0.046, 0.205, 8).rotateZ(Math.PI / 2),
  ]
  for (let spoke = 0; spoke < 5; spoke++)
    pieces.push(
      new BoxGeometry(0.203, 0.027, 0.28).rotateX((spoke * Math.PI) / 5),
    )
  const converted = pieces.map((piece) => piece.toNonIndexed())
  const merged = mergeGeometries(converted)!
  ;[...pieces, ...converted].forEach((piece) => piece.dispose())
  return merged
})()

const digits = [
  'abcdef',
  'bc',
  'abdeg',
  'abcdg',
  'bcfg',
  'acdfg',
  'acdefg',
  'abc',
  'abcdefg',
  'abcdfg',
]
const numberGeometry = new Map<number, BufferGeometry>()
export const numberPlateGeometry = new BoxGeometry(0.26, 0.3, 0.006)
export function getNumberGeometry(number: number): BufferGeometry {
  const cached = numberGeometry.get(number)
  if (cached) return cached
  const pieces: BufferGeometry[] = []
  const text = String(number)
  for (const [index, digit] of [...text].entries()) {
    const offset = text.length === 1 ? 0 : index === 0 ? -0.06 : 0.06
    const segments: Record<
      string,
      [x: number, y: number, horizontal: boolean]
    > = {
      a: [0, 0.09, true],
      b: [0.038, 0.045, false],
      c: [0.038, -0.045, false],
      d: [0, -0.09, true],
      e: [-0.038, -0.045, false],
      f: [-0.038, 0.045, false],
      g: [0, 0, true],
    }
    for (const name of digits[Number(digit)]) {
      const [x, y, horizontal] = segments[name]
      pieces.push(
        new BoxGeometry(
          horizontal ? 0.075 : 0.018,
          horizontal ? 0.018 : 0.075,
          0.008,
        ).translate(offset + x, y, 0.007),
      )
    }
  }
  const converted = pieces.map((piece) => piece.toNonIndexed())
  const geometry = mergeGeometries(converted)!
  ;[...pieces, ...converted].forEach((piece) => piece.dispose())
  numberGeometry.set(number, geometry)
  return geometry
}
