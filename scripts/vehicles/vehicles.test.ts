import { afterAll, describe, expect, it } from 'vitest'
import {
  Box3,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Triangle,
  Vector3,
} from 'three'
import type { BufferGeometry } from 'three'
import { buildFormula } from './formula.mjs'
import { buildGt } from './gt.mjs'
import { buildPrototype } from './prototype.mjs'
import { buildWheel } from './wheels.mjs'

type Point = [number, number, number]
type Parts = Record<string, BufferGeometry[]>
type Wheel = {
  x: number
  y: number
  z: number
  radius: number
  width: number
  front: boolean
  style: string
}
type Mirror = { side: number; base: Point; tip: Point; size: Point }
type Definition = {
  parts: Parts
  wheels: Wheel[]
  decals: { position: Point; normal: Point; width: number; height: number }[]
  anchors: { mirrors: Mirror[] }
}

const models = Object.entries({
  formula: buildFormula,
  gt: buildGt,
  prototype: buildPrototype,
}).map(([id, build]) => ({
  id,
  high: build('high') as Definition,
  low: build('low') as Definition,
}))
const variants = models.flatMap((model) =>
  (['high', 'low'] as const).map((detail) => ({
    label: `${model.id} ${detail}`,
    detail,
    definition: model[detail],
  })),
)
const rayMaterial = new MeshBasicMaterial({ side: DoubleSide })

function geometries(parts: Parts) {
  return Object.values(parts).flat()
}

function boundsOf(parts: Parts) {
  const bounds = new Box3()
  for (const geometry of geometries(parts)) {
    geometry.computeBoundingBox()
    bounds.union(geometry.boundingBox!)
  }
  return bounds
}

function triangleCount(parts: Parts) {
  return geometries(parts).reduce(
    (total, geometry) =>
      total + (geometry.index?.count ?? geometry.attributes.position.count) / 3,
    0,
  )
}

function validateGeometry(parts: Parts) {
  for (const [role, pieces] of Object.entries(parts)) {
    expect(pieces.length, role).toBeGreaterThan(0)
    for (const geometry of pieces) {
      const positions = geometry.getAttribute('position')
      expect(positions.count, role).toBeGreaterThan(2)
      for (const name of ['position', 'normal', 'uv']) {
        const attribute = geometry.getAttribute(name)
        expect(attribute, `${role}.${name}`).toBeDefined()
        expect(attribute.count, `${role}.${name}`).toBe(positions.count)
        expect(
          Array.from(attribute.array).every(Number.isFinite),
          `${role}.${name} must be finite`,
        ).toBe(true)
      }
      const normals = geometry.getAttribute('normal')
      let largestNormalError = 0
      for (let index = 0; index < normals.count; index++) {
        largestNormalError = Math.max(
          largestNormalError,
          Math.abs(
            Math.hypot(
              normals.getX(index),
              normals.getY(index),
              normals.getZ(index),
            ) - 1,
          ),
        )
      }
      expect(
        largestNormalError,
        `${role} has zero or non-unit normals`,
      ).toBeLessThan(1e-4)
      const indices = geometry.index
      expect(
        (indices?.count ?? positions.count) % 3,
        `${role} triangle topology`,
      ).toBe(0)
      if (indices) {
        expect(
          Array.from(indices.array).every(
            (index) =>
              Number.isInteger(index) && index >= 0 && index < positions.count,
          ),
          `${role} index bounds`,
        ).toBe(true)
      }
    }
  }
}

function nearestSurfaceDistance(pieces: BufferGeometry[], point: Point) {
  const origin = new Vector3(...point),
    closest = new Vector3(),
    triangle = new Triangle()
  let distance = Infinity
  for (const geometry of pieces) {
    const positions = geometry.getAttribute('position'),
      indices = geometry.index
    const count = indices?.count ?? positions.count
    for (let index = 0; index < count; index += 3) {
      triangle.a.fromBufferAttribute(
        positions,
        indices ? indices.getX(index) : index,
      )
      triangle.b.fromBufferAttribute(
        positions,
        indices ? indices.getX(index + 1) : index + 1,
      )
      triangle.c.fromBufferAttribute(
        positions,
        indices ? indices.getX(index + 2) : index + 2,
      )
      triangle.closestPointToPoint(origin, closest)
      distance = Math.min(distance, origin.distanceTo(closest))
    }
  }
  return distance
}

afterAll(() => {
  for (const { definition } of variants)
    for (const geometry of geometries(definition.parts)) geometry.dispose()
  rayMaterial.dispose()
})

describe.each(variants)('$label authored vehicle', ({ definition, detail }) => {
  it('exports finite, normalized surfaces within the shared vehicle envelope', () => {
    validateGeometry(definition.parts)
    const bounds = boundsOf(definition.parts)
    expect(bounds.min.y).toBeGreaterThanOrEqual(0)
    expect(bounds.min.z).toBeGreaterThanOrEqual(-1.201)
    expect(bounds.max.z).toBeLessThanOrEqual(1.201)
    expect(bounds.max.y).toBeLessThan(0.8)
    expect(bounds.max.x).toBeLessThan(0.7)
    expect(bounds.min.x).toBeGreaterThan(-0.7)
    for (const role of ['paint', 'accent', 'carbon', 'glass', 'mirror'])
      expect(definition.parts[role], role).toBeDefined()
    for (const decal of definition.decals) {
      expect([...decal.position, ...decal.normal].every(Number.isFinite)).toBe(
        true,
      )
      expect(new Vector3(...decal.normal).length()).toBeCloseTo(1, 2)
      expect(decal.width).toBeGreaterThan(0)
      expect(decal.height).toBeGreaterThan(0)
      expect(
        bounds
          .clone()
          .expandByScalar(0.03)
          .containsPoint(new Vector3(...decal.position)),
      ).toBe(true)
    }
  })

  it('keeps two symmetric axles, grounded tires and centered local wheel meshes', () => {
    expect(definition.wheels).toHaveLength(4)
    for (const front of [true, false]) {
      const pair = definition.wheels
        .filter((wheel) => wheel.front === front)
        .sort((a, b) => a.x - b.x)
      expect(pair).toHaveLength(2)
      const [left, right] = pair
      expect(left.x).toBeLessThan(0)
      expect(right).toEqual({ ...left, x: -left.x })
      expect(front ? left.z < 0 : left.z > 0).toBe(true)
      expect(left.y).toBeCloseTo(left.radius, 8)
      const parts = buildWheel(left, detail) as Parts
      try {
        validateGeometry(parts)
        const bounds = boundsOf(parts)
        expect(bounds.min.y + left.y).toBeCloseTo(0, 2)
        expect(bounds.max.y - left.radius).toBeCloseTo(0, 2)
        expect(bounds.min.x).toBeGreaterThanOrEqual(-left.width / 2 - 0.002)
        expect(bounds.max.x).toBeLessThanOrEqual(left.width / 2 + 0.002)
        expect(bounds.getCenter(new Vector3()).length()).toBeLessThan(0.003)
      } finally {
        for (const geometry of geometries(parts)) geometry.dispose()
      }
    }
  })

  it('attaches symmetric mirrors to the chassis with supports reaching each housing', () => {
    const mirrors = [...definition.anchors.mirrors].sort(
      (a, b) => a.side - b.side,
    )
    expect(mirrors).toHaveLength(2)
    const [left, right] = mirrors
    expect(left.side).toBe(-1)
    expect(right).toEqual({
      ...left,
      side: 1,
      base: [-left.base[0], left.base[1], left.base[2]],
      tip: [-left.tip[0], left.tip[1], left.tip[2]],
    })
    for (const mirror of mirrors) {
      expect(
        mirror.size.every((size) => Number.isFinite(size) && size > 0),
      ).toBe(true)
      expect(mirror.side * (mirror.tip[0] - mirror.base[0])).toBeGreaterThan(
        0.03,
      )
      // The mounting pad must touch the body, rather than just its own support mesh.
      expect(
        nearestSurfaceDistance(definition.parts.paint, mirror.base),
        `floating mirror base ${mirror.side}`,
      ).toBeLessThan(0.022)
      expect(
        nearestSurfaceDistance(definition.parts.carbon, mirror.base),
      ).toBeLessThan(0.02)
      expect(
        nearestSurfaceDistance(definition.parts.carbon, mirror.tip),
      ).toBeLessThan(0.02)
      expect(
        nearestSurfaceDistance(definition.parts.paint, mirror.tip),
      ).toBeLessThan(Math.min(...mirror.size) / 2 + 0.003)
    }
  })

  it('leaves the tire envelope open instead of hiding it behind painted body panels', () => {
    const meshes = [...definition.parts.paint, ...definition.parts.accent].map(
      (geometry) => new Mesh(geometry, rayMaterial),
    )
    for (const wheel of definition.wheels) {
      const side = Math.sign(wheel.x)
      // Cast through the tire width at its equator and upper shoulder; suspension may remain inside.
      for (const angle of [
        0,
        Math.PI / 6,
        Math.PI / 2,
        (Math.PI * 5) / 6,
        Math.PI,
      ]) {
        const origin = new Vector3(
          side * (Math.abs(wheel.x) + wheel.width / 2 + 0.1),
          wheel.y + Math.sin(angle) * wheel.radius * 0.95,
          wheel.z + Math.cos(angle) * wheel.radius * 0.95,
        )
        const ray = new Raycaster(
          origin,
          new Vector3(-side, 0, 0),
          0,
          wheel.width + 0.1 - 0.005,
        )
        expect(
          ray.intersectObjects(meshes, false),
          `blocked tire x=${wheel.x}, z=${wheel.z}, angle=${angle}`,
        ).toHaveLength(0)
      }
    }
  })

  it('fits each exposed reflector inside its housing with a connected surround', () => {
    const paintedMeshes = definition.parts.paint.map(
      (geometry) => new Mesh(geometry, rayMaterial),
    )
    expect(definition.parts.mirror).toHaveLength(2)
    for (const reflector of definition.parts.mirror) {
      reflector.computeBoundingBox()
      const center = reflector.boundingBox!.getCenter(new Vector3())
      const anchor = definition.anchors.mirrors.find(
        (mirror) => Math.sign(center.x) === mirror.side,
      )!
      const positions = reflector.getAttribute('position'),
        normals = reflector.getAttribute('normal')
      const normal = new Vector3().fromBufferAttribute(normals, 0)
      expect(normal.z).toBeGreaterThan(0.9)
      const edges = new Map<string, { count: number; a: number; b: number }>()
      const indices = reflector.index!
      const vertexKey = (index: number) =>
        [positions.getX(index), positions.getY(index), positions.getZ(index)]
          .map((value) => Math.round(value * 1e6))
          .join(',')
      for (let index = 0; index < indices.count; index += 3) {
        const triangle = [
          indices.getX(index),
          indices.getX(index + 1),
          indices.getX(index + 2),
        ]
        for (let edge = 0; edge < 3; edge++) {
          const a = triangle[edge],
            b = triangle[(edge + 1) % 3]
          const key = [vertexKey(a), vertexKey(b)].sort().join(':')
          const existing = edges.get(key)
          if (existing) existing.count++
          else edges.set(key, { count: 1, a, b })
        }
      }
      for (const edge of edges.values()) {
        if (edge.count !== 1) continue
        const a = new Vector3().fromBufferAttribute(positions, edge.a)
        const b = new Vector3().fromBufferAttribute(positions, edge.b)
        const midpoint = a.add(b).multiplyScalar(0.5)
        expect(
          nearestSurfaceDistance(definition.parts.carbon, midpoint.toArray()),
          'reflector perimeter must touch the surround',
        ).toBeLessThan(1e-5)
      }
      for (let index = 0; index < positions.count; index++) {
        const point = new Vector3().fromBufferAttribute(positions, index)
        expect(
          Math.abs(point.clone().sub(center).dot(normal)),
          'reflector must be planar',
        ).toBeLessThan(1e-6)
        point.lerp(center, 0.1)
        const ray = new Raycaster(
          point.clone().addScaledVector(normal, 0.01),
          normal.clone().negate(),
          0,
          anchor.size[2] + 0.011,
        )
        const hits = ray.intersectObjects(paintedMeshes, false)
        expect(
          hits.length,
          'reflector must sit within the painted shell footprint',
        ).toBeGreaterThan(0)
        expect(
          hits[0].distance,
          'paint must not bury the reflective face',
        ).toBeGreaterThan(0.0099)
      }
    }
  })
})

describe.each(models)('$id level-of-detail contract', ({ high, low }) => {
  it('reduces geometry without changing wheel pivots, decals or attachment anchors', () => {
    expect(low.wheels).toEqual(high.wheels)
    expect(low.decals).toEqual(high.decals)
    expect(low.anchors).toEqual(high.anchors)
    expect(triangleCount(low.parts)).toBeLessThan(
      triangleCount(high.parts) * 0.65,
    )
    const highSize = boundsOf(high.parts).getSize(new Vector3())
    const lowSize = boundsOf(low.parts).getSize(new Vector3())
    expect(Math.abs(highSize.x - lowSize.x)).toBeLessThan(0.01)
    expect(Math.abs(highSize.z - lowSize.z)).toBeLessThan(0.01)
  })
})
