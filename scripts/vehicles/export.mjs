import { mkdir, writeFile } from 'node:fs/promises'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import {
  mergeGeometries,
  mergeVertices,
} from 'three/addons/utils/BufferGeometryUtils.js'
import { buildWheel } from './wheels.mjs'
import { buildGt } from './gt.mjs'
import { buildFormula } from './formula.mjs'
import { buildPrototype } from './prototype.mjs'

globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result
      this.onloadend?.()
    })
  }
}

const colors = {
  paint: '#c65529',
  accent: '#ece2c6',
  glass: '#263c45',
  carbon: '#171c20',
  metal: '#8a9094',
  rim: '#b8bec3',
  lights: '#d6efff',
  rearLights: '#e64031',
  mirror: '#b4c8d1',
}
const materials = Object.fromEntries(
  Object.entries(colors).map(([role, color]) => {
    const material = new MeshStandardMaterial({
      color,
      metalness: ['metal', 'rim', 'mirror'].includes(role) ? 0.7 : 0.15,
      roughness: role === 'glass' ? 0.18 : 0.4,
    })
    material.name = role
    material.userData = { role }
    return [role, material]
  }),
)

function meshes(parts, prefix) {
  const group = new Group()
  for (const [role, geometries] of Object.entries(parts)) {
    const pieces = geometries.map((geometry) =>
      geometry.index ? geometry.toNonIndexed() : geometry,
    )
    const geometry = mergeVertices(mergeGeometries(pieces), 1e-5)
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    const mesh = new Mesh(geometry, materials[role])
    mesh.name = `${prefix}_${role}`
    mesh.userData = { role }
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }
  return group
}

export function assembleAsset(id, detail, definition) {
  const root = new Group()
  root.name = `vehicle_${id}`
  root.userData = {
    modelId: id,
    detail,
    wheels: definition.wheels,
    decals: definition.decals,
    anchors: definition.anchors,
  }
  root.add(meshes(definition.parts, 'body'))
  const wheelCache = new Map()
  definition.wheels.forEach((wheel, index) => {
    const key = JSON.stringify([wheel.radius, wheel.width, wheel.style])
    if (!wheelCache.has(key))
      wheelCache.set(key, meshes(buildWheel(wheel, detail), 'wheel'))
    const steer = new Group(),
      spin = wheelCache.get(key).clone(true)
    steer.name = `steer_${index}`
    spin.name = `spin_${index}`
    steer.position.set(wheel.x, wheel.y, wheel.z)
    steer.userData = { front: wheel.front, radius: wheel.radius }
    steer.add(spin)
    if (detail === 'high') {
      const caliper = new Mesh(
        new BoxGeometry(0.025, 0.084, 0.04),
        materials.carbon,
      )
      caliper.name = `caliper_${index}`
      caliper.userData = { role: 'carbon' }
      caliper.position.set(
        Math.sign(wheel.x) * wheel.width * 0.3,
        0.035,
        -wheel.radius * 0.37,
      )
      steer.add(caliper)
    }
    root.add(steer)
  })
  return root
}

const out = new URL('../../public/models/vehicles/', import.meta.url)
await mkdir(out, { recursive: true })
const manifest = {}
for (const [id, build] of Object.entries({
  formula: buildFormula,
  gt: buildGt,
  prototype: buildPrototype,
})) {
  manifest[id] = {}
  for (const detail of ['high', 'low']) {
    const definition = build(detail)
    const root = assembleAsset(id, detail, definition)
    let triangles = 0,
      draws = 0
    root.traverse((object) => {
      if (!object.isMesh) return
      triangles +=
        (object.geometry.index?.count ??
          object.geometry.attributes.position.count) / 3
      draws++
    })
    const glb = await new GLTFExporter().parseAsync(root, {
      binary: true,
      onlyVisible: true,
    })
    await writeFile(new URL(`${id}-${detail}.glb`, out), Buffer.from(glb))
    manifest[id][detail] = { bytes: glb.byteLength, triangles, draws }
    console.log(
      `${id} ${detail}: ${triangles} triangles, ${draws} draws, ${(glb.byteLength / 1024).toFixed(0)} KiB`,
    )
  }
}
await writeFile(
  new URL('manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
)
