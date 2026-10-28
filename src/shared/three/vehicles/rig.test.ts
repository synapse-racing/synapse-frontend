import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  BoxGeometry,
  Box3,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Triangle,
  Vector3,
  type BufferGeometry,
  type Object3D,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultAppearance } from '../../../features/garage/domain/appearance.ts'
import { createVehicleMaterials } from './materials.ts'
import {
  animateVehicleWheels,
  createVehicleRig,
  type NumberPlacement,
  type VehicleRig,
  type WheelMetadata,
} from './rig.ts'

const cleanup: Array<() => void> = []

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect: vi.fn(),
    fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose())
  vi.restoreAllMocks()
})

function materials(
  primaryColor = defaultAppearance.primaryColor,
  faded = false,
) {
  const result = createVehicleMaterials(
    { ...defaultAppearance, primaryColor },
    faded,
  )
  cleanup.push(() =>
    Object.values(result).forEach((material) => material.dispose()),
  )
  return result
}

function trackSource(source: Object3D) {
  cleanup.push(() => {
    const geometries = new Set<BufferGeometry>()
    const originalMaterials = new Set<Material>()
    source.traverse((object) => {
      if (!(object instanceof Mesh)) return
      geometries.add(object.geometry)
      const entries = Array.isArray(object.material)
        ? object.material
        : [object.material]
      entries.forEach((material) => originalMaterials.add(material))
    })
    geometries.forEach((geometry) => geometry.dispose())
    originalMaterials.forEach((material) => material.dispose())
  })
  return source
}

function fixture() {
  const vehicle = new Group()
  const wheels: WheelMetadata[] = [-1, 1].flatMap((side) => [
    {
      x: side * 0.455,
      y: 0.21,
      z: -0.76,
      radius: 0.21,
      width: 0.16,
      front: true,
    },
    {
      x: side * 0.455,
      y: 0.23,
      z: 0.75,
      radius: 0.23,
      width: 0.2,
      front: false,
    },
  ])
  const decals: NumberPlacement[] = [
    {
      position: [0, 0.302, -0.5],
      normal: [0, 1, 0],
      width: 0.12,
      height: 0.18,
    },
    { position: [0.402, 0.16, 0], normal: [1, 0, 0], width: 0.1, height: 0.15 },
    {
      position: [-0.402, 0.16, 0],
      normal: [-1, 0, 0],
      width: 0.1,
      height: 0.15,
    },
  ]
  vehicle.userData = { modelId: 'formula', wheels, decals }
  const paint = new MeshStandardMaterial()
  paint.name = 'paint'
  const body = new Mesh(
    new BoxGeometry(0.8, 0.3, 1.5).translate(0, 0.15, 0),
    paint,
  )
  body.name = 'body_paint'
  body.userData.role = 'paint'
  vehicle.add(body)
  wheels.forEach((wheel, index) => {
    const steer = new Group()
    steer.name = `steer_${index}`
    steer.position.set(wheel.x, wheel.y, wheel.z)
    const spin = new Group()
    spin.name = `spin_${index}`
    const rim = new MeshStandardMaterial()
    rim.name = 'rim'
    spin.add(new Mesh(new BoxGeometry(0.1, 0.2, 0.2), rim))
    steer.add(spin)
    vehicle.add(steer)
  })
  trackSource(vehicle)
  return { vehicle, body }
}

function rig(
  source: Object3D,
  palette = materials(),
  number = 7,
  faded = false,
) {
  const result = createVehicleRig(source, palette, number, faded)
  cleanup.push(result.dispose)
  return result
}

function decalsOf(value: VehicleRig) {
  return value.model.children.at(-1)!.children as Array<
    Mesh<BufferGeometry, MeshStandardMaterial>
  >
}

function paintedTriangles(body: Mesh) {
  const positions = body.geometry.getAttribute('position')
  const indices = body.geometry.index
  const triangles: Triangle[] = []
  for (let index = 0; index < (indices?.count ?? positions.count); index += 3) {
    const corners = [0, 1, 2].map((offset) =>
      new Vector3()
        .fromBufferAttribute(
          positions,
          indices ? indices.getX(index + offset) : index + offset,
        )
        .applyMatrix4(body.matrixWorld),
    )
    triangles.push(new Triangle(corners[0], corners[1], corners[2]))
  }
  return triangles
}

function expectSurfaceContact(decal: Mesh, triangles: Triangle[]) {
  const position = decal.geometry.getAttribute('position')
  expect(position.count).toBeGreaterThan(0)
  decal.geometry.computeBoundingBox()
  const bounds = decal.geometry.boundingBox!.clone().expandByScalar(1e-5)
  const nearby = triangles.filter((triangle) =>
    bounds.intersectsBox(
      new Box3().setFromPoints([triangle.a, triangle.b, triangle.c]),
    ),
  )
  expect(nearby.length).toBeGreaterThan(0)
  const point = new Vector3(),
    closest = new Vector3()
  for (let index = 0; index < position.count; index++) {
    point.fromBufferAttribute(position, index)
    expect(
      nearby.some(
        (triangle) =>
          triangle
            .closestPointToPoint(point, closest)
            .distanceToSquared(point) < 1e-10,
      ),
    ).toBe(true)
  }
}

function textureAxes(decal: Mesh) {
  const position = decal.geometry.getAttribute('position')
  const uv = decal.geometry.getAttribute('uv')
  for (let index = 0; index < position.count; index += 3) {
    const p = [0, 1, 2].map((offset) =>
      new Vector3().fromBufferAttribute(position, index + offset),
    )
    const du1 = uv.getX(index + 1) - uv.getX(index),
      dv1 = uv.getY(index + 1) - uv.getY(index)
    const du2 = uv.getX(index + 2) - uv.getX(index),
      dv2 = uv.getY(index + 2) - uv.getY(index)
    const determinant = du1 * dv2 - du2 * dv1
    if (Math.abs(determinant) < 1e-8) continue
    const edge1 = p[1].sub(p[0]),
      edge2 = p[2].sub(p[0])
    return {
      right: edge1
        .clone()
        .multiplyScalar(dv2)
        .addScaledVector(edge2, -dv1)
        .divideScalar(determinant)
        .normalize(),
      up: edge2
        .clone()
        .multiplyScalar(du1)
        .addScaledVector(edge1, -du2)
        .divideScalar(determinant)
        .normalize(),
    }
  }
  throw new Error('The projected number has no nondegenerate UV triangles')
}

describe('vehicle asset rig contract', () => {
  it.each([
    'formula-high',
    'formula-low',
    'gt-high',
    'gt-low',
    'prototype-high',
    'prototype-low',
  ])(
    'loads valid wheel anchors and projects numbers onto the painted surface of %s.glb',
    async (name) => {
      const bytes = await readFile(
        resolve('public/models/vehicles', `${name}.glb`),
      )
      const asset = await new GLTFLoader().parseAsync(
        Uint8Array.from(bytes).buffer,
        '',
      )
      trackSource(asset.scene)
      const palette = materials()
      const instance = rig(asset.scene, palette)
      const metadata = instance.model.userData as {
        modelId: string
        wheels: WheelMetadata[]
        decals: NumberPlacement[]
      }

      expect(metadata.modelId).toBe(name.replace(/-(high|low)$/, ''))
      expect(instance.wheels).toHaveLength(4)
      expect(instance.wheels.filter((wheel) => wheel.front)).toHaveLength(2)
      instance.wheels.forEach((wheel, index) => {
        const anchor = metadata.wheels[index]
        expect(wheel.radius).toBeGreaterThan(0)
        expect(wheel.steer.position.toArray()).toEqual([
          anchor.x,
          anchor.y,
          anchor.z,
        ])
        expect(wheel.spin.parent).toBe(wheel.steer)
        const caliper = instance.model.getObjectByName(`caliper_${index}`)
        if (name.endsWith('-high')) expect(caliper?.parent).toBe(wheel.steer)
        else expect(caliper).toBeUndefined()
        expect(wheel.spin.position.length()).toBe(0)
        wheel.spin.traverse((object) => {
          if (object instanceof Mesh)
            expect(Object.values(palette)).toContain(object.material)
        })
      })

      const decals = decalsOf(instance)
      const body = instance.model.getObjectByName('body_paint') as Mesh
      const triangles = paintedTriangles(body)
      expect(decals.length).toBeGreaterThan(0)
      expect(decals).toHaveLength(metadata.decals.length)
      decals.forEach((decal, index) => {
        const placement = metadata.decals[index]
        expect(decal.position.length()).toBe(0)
        expectSurfaceContact(decal, triangles)
        const axes = textureAxes(decal)
        const desiredUp =
          Math.abs(placement.normal[1]) > 0.75
            ? new Vector3(0, 0, 1)
            : new Vector3(0, 1, 0)
        expect(axes.up.dot(desiredUp)).toBeGreaterThan(0)
        expect(
          axes.right.dot(
            desiredUp.clone().cross(new Vector3(...placement.normal)),
          ),
        ).toBeGreaterThan(0)
      })
    },
  )

  it('reports a missing anchor root before constructing a rig', () => {
    expect(() => createVehicleRig(new Group(), materials(), 7, false)).toThrow(
      'missing wheel anchors',
    )
  })
})

it('keeps hood numbers facing the nose and both side numbers upright without mirroring', () => {
  const { vehicle } = fixture()
  const instance = rig(vehicle)
  const expectedAxes = [
    { right: [-1, 0, 0], up: [0, 0, 1] },
    { right: [0, 0, -1], up: [0, 1, 0] },
    { right: [0, 0, 1], up: [0, 1, 0] },
  ]
  decalsOf(instance).forEach((decal, index) => {
    const axes = textureAxes(decal)
    expect(
      axes.right.distanceTo(new Vector3().fromArray(expectedAxes[index].right)),
    ).toBeLessThan(1e-7)
    expect(
      axes.up.distanceTo(new Vector3().fromArray(expectedAxes[index].up)),
    ).toBeLessThan(1e-7)
  })
})

it('steers the front wheel frame before rolling around its local axle and preserves wheel centers', () => {
  const { vehicle } = fixture()
  const instance = rig(vehicle)
  const distance = 0.63
  const steering = 0.42
  animateVehicleWheels(instance, distance, steering)
  instance.model.updateMatrixWorld(true)

  instance.wheels.forEach((wheel, index) => {
    const yaw = wheel.front ? steering : 0
    const expected = new Quaternion()
      .setFromAxisAngle(new Vector3(0, 1, 0), yaw)
      .multiply(
        new Quaternion().setFromAxisAngle(
          new Vector3(1, 0, 0),
          -distance / wheel.radius,
        ),
      )
    expect(
      wheel.spin.getWorldQuaternion(new Quaternion()).angleTo(expected),
    ).toBeLessThan(1e-7)
    const anchor = vehicle.userData.wheels[index] as WheelMetadata
    expect(wheel.spin.getWorldPosition(new Vector3()).toArray()).toEqual([
      anchor.x,
      anchor.y,
      anchor.z,
    ])
    const axle = new Vector3(1, 0, 0).applyQuaternion(
      wheel.spin.getWorldQuaternion(new Quaternion()),
    )
    expect(
      axle.distanceTo(new Vector3(Math.cos(yaw), 0, -Math.sin(yaw))),
    ).toBeLessThan(1e-7)
  })

  animateVehicleWheels(instance, -0.21, -0.19)
  instance.wheels.forEach((wheel) => {
    expect(wheel.spin.rotation.x).toBeCloseTo(-0.42 / wheel.radius)
    expect(wheel.steer.rotation.y).toBe(wheel.front ? -0.19 : 0)
  })
})

it('keeps transforms, appearance materials and visibility independent while sharing immutable geometry', () => {
  const { vehicle, body } = fixture()
  const red = materials('#e13131')
  const blue = materials('#315ce1', true)
  const first = rig(vehicle, red, 23)
  const second = rig(vehicle, blue, 42, true)
  const firstBody = first.model.getObjectByName('body_paint') as Mesh
  const secondBody = second.model.getObjectByName('body_paint') as Mesh

  expect(first.model).not.toBe(second.model)
  expect(firstBody.geometry).toBe(body.geometry)
  expect(secondBody.geometry).toBe(body.geometry)
  expect(firstBody.material).toBe(red.paint)
  expect(secondBody.material).toBe(blue.paint)
  expect(body.material).not.toBe(red.paint)
  expect(firstBody.castShadow).toBe(true)
  expect(secondBody.castShadow).toBe(false)
  expect(blue.paint.opacity).toBe(0.35)
  expect(blue.paint.depthWrite).toBe(false)

  animateVehicleWheels(first, 0.8, 0.3)
  first.model.visible = false
  red.paint.color.set('#00ff00')
  first.model.userData.wheels[0].radius = 99
  expect(second.model.visible).toBe(true)
  expect(blue.paint.color.getHexString()).toBe('315ce1')
  expect(second.model.userData.wheels[0].radius).toBe(0.21)
  expect(vehicle.userData.wheels[0].radius).toBe(0.21)
  second.wheels.forEach((wheel, index) => {
    expect(wheel.steer).not.toBe(first.wheels[index].steer)
    expect(wheel.spin.rotation.x).toBeCloseTo(0)
    expect(wheel.steer.rotation.y).toBeCloseTo(0)
    expect(vehicle.getObjectByName(`spin_${index}`)!.rotation.x).toBeCloseTo(0)
  })
  expect(decalsOf(first)[0].material.map).not.toBe(
    decalsOf(second)[0].material.map,
  )
})

it('disposes only instance-owned decals and preserves shared textures, source geometry and supplied materials', () => {
  const { vehicle, body } = fixture()
  const palette = materials()
  const first = rig(vehicle, palette)
  const second = rig(vehicle, palette)
  const firstDecals = decalsOf(first)
  const secondDecals = decalsOf(second)
  const geometryDisposals = firstDecals.map((decal) =>
    vi.spyOn(decal.geometry, 'dispose'),
  )
  const ownMaterialDisposal = vi.spyOn(firstDecals[0].material, 'dispose')
  const otherMaterialDisposal = vi.spyOn(secondDecals[0].material, 'dispose')
  const textureDisposal = vi.spyOn(firstDecals[0].material.map!, 'dispose')
  const sourceGeometryDisposal = vi.spyOn(body.geometry, 'dispose')
  const sourceMaterialDisposal = vi.spyOn(body.material as Material, 'dispose')
  const paletteDisposals = Object.values(palette).map((material) =>
    vi.spyOn(material, 'dispose'),
  )
  expect(firstDecals[0].material.map).toBe(secondDecals[0].material.map)

  first.dispose()

  geometryDisposals.forEach((dispose) =>
    expect(dispose).toHaveBeenCalledTimes(1),
  )
  expect(ownMaterialDisposal).toHaveBeenCalledTimes(1)
  expect(otherMaterialDisposal).not.toHaveBeenCalled()
  expect(textureDisposal).not.toHaveBeenCalled()
  expect(sourceGeometryDisposal).not.toHaveBeenCalled()
  expect(sourceMaterialDisposal).not.toHaveBeenCalled()
  paletteDisposals.forEach((dispose) => expect(dispose).not.toHaveBeenCalled())
  animateVehicleWheels(second, 0.21, 0.2)
  expect(second.wheels[0].spin.rotation.x).toBeCloseTo(-1)
})
