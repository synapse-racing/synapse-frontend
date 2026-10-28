import {
  Euler,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  type Material,
} from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'
import { numberTexture } from './materials.ts'

export interface WheelMetadata {
  x: number
  y: number
  z: number
  radius: number
  width: number
  front: boolean
}
export interface NumberPlacement {
  position: [number, number, number]
  normal: [number, number, number]
  width: number
  height: number
}
export interface VehicleRig {
  model: Object3D
  wheels: { steer: Object3D; spin: Object3D; radius: number; front: boolean }[]
  dispose: () => void
}

export function createVehicleRig(
  source: Object3D,
  materials: Record<string, Material>,
  number: number,
  faded: boolean,
): VehicleRig {
  const vehicle = source.userData.wheels
    ? source
    : source.children.find((child) => child.userData.wheels)
  if (!vehicle) throw new Error('Vehicle asset is missing wheel anchors')
  const model = vehicle.clone(true)
  const metadata = model.userData as {
    wheels: WheelMetadata[]
    decals: NumberPlacement[]
  }
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const role = object.userData.role ?? (object.material as Material).name
    if (materials[role]) object.material = materials[role]
    object.castShadow = !faded
    object.receiveShadow = true
  })
  const wheels = metadata.wheels.map((wheel, index) => ({
    steer: model.getObjectByName(`steer_${index}`)!,
    spin: model.getObjectByName(`spin_${index}`)!,
    radius: wheel.radius,
    front: wheel.front,
  }))
  const decalMaterial = new MeshStandardMaterial({
    map: numberTexture(number),
    roughness: 0.45,
    metalness: 0.1,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    transparent: faded,
    opacity: faded ? 0.35 : 1,
    depthWrite: !faded,
  })
  const decals = new Group()
  const body = model.getObjectByName('body_paint') as Mesh
  model.updateMatrixWorld(true)
  for (const placement of metadata.decals) {
    const normal = new Vector3(...placement.normal).normalize()
    const up =
      Math.abs(normal.y) > 0.75 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0)
    const right = up.clone().cross(normal).normalize()
    up.crossVectors(normal, right).normalize()
    const orientation = new Euler().setFromRotationMatrix(
      new Matrix4().makeBasis(right, up, normal),
    )
    const geometry = new DecalGeometry(
      body,
      new Vector3(...placement.position),
      orientation,
      new Vector3(placement.width, placement.height, 0.18),
    )
    const mesh = new Mesh(geometry, decalMaterial)
    mesh.receiveShadow = true
    decals.add(mesh)
  }
  model.add(decals)
  return {
    model,
    wheels,
    dispose: () => {
      decalMaterial.dispose()
      decals.children.forEach((child) => (child as Mesh).geometry.dispose())
    },
  }
}

export function animateVehicleWheels(
  rig: Pick<VehicleRig, 'wheels'>,
  distance: number,
  steerAngle: number,
) {
  for (const wheel of rig.wheels) {
    wheel.steer.rotation.y = wheel.front ? steerAngle : 0
    wheel.spin.rotation.x -= distance / wheel.radius
  }
}
