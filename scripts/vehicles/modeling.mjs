import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Matrix4,
  RingGeometry,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export function surface(grid, flip = false) {
  const rows = grid.length,
    columns = grid[0].length
  const positions = [],
    uv = [],
    indices = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      positions.push(...grid[row][col])
      uv.push(col / (columns - 1), row / (rows - 1))
      if (row === rows - 1 || col === columns - 1) continue
      const a = row * columns + col,
        b = a + 1,
        c = a + columns,
        d = c + 1
      indices.push(...(flip ? [a, b, c, b, d, c] : [a, c, b, b, c, d]))
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function sampleSections(sections, z) {
  let index = sections.findIndex((section) => section[0] >= z)
  if (index <= 0) return sections[index < 0 ? sections.length - 1 : 0]
  const a = sections[index - 1],
    b = sections[index]
  const span = b[0] - a[0],
    t = (z - a[0]) / span
  const tangent = (at, field) => {
    const previous = sections[Math.max(0, at - 1)],
      current = sections[at],
      next = sections[Math.min(sections.length - 1, at + 1)]
    if (at === 0) return (next[field] - current[field]) / (next[0] - current[0])
    if (at === sections.length - 1)
      return (current[field] - previous[field]) / (current[0] - previous[0])
    const before = current[0] - previous[0],
      after = next[0] - current[0]
    const left = (current[field] - previous[field]) / before,
      right = (next[field] - current[field]) / after
    if (left * right <= 0) return 0
    const w1 = 2 * after + before,
      w2 = after + 2 * before
    return (w1 + w2) / (w1 / left + w2 / right)
  }
  return a.map((value, field) =>
    field === 0
      ? z
      : (2 * t ** 3 - 3 * t ** 2 + 1) * value +
        (t ** 3 - 2 * t ** 2 + t) * span * tangent(index - 1, field) +
        (-2 * t ** 3 + 3 * t ** 2) * b[field] +
        (t ** 3 - t ** 2) * span * tangent(index, field),
  )
}

export function createBuilder(detail = 'high') {
  const high = detail === 'high'
  const parts = {}
  const mirrors = []
  const builder = {
    detail,
    high,
    parts,
    add(role, geometry) {
      if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
      if (!geometry.getAttribute('uv')) {
        const position = geometry.getAttribute('position'),
          uv = []
        for (let i = 0; i < position.count; i++)
          uv.push(position.getX(i), position.getZ(i))
        geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2))
      }
      ;(parts[role] ??= []).push(geometry)
      return geometry
    },
    box(role, size, position, rotation = [0, 0, 0], radius = 0.01) {
      const bevel = Math.min(radius, ...size.map((value) => value * 0.45))
      const geometry = high
        ? new RoundedBoxGeometry(...size, 2, bevel)
        : new BoxGeometry(...size)
      geometry
        .rotateX(rotation[0])
        .rotateY(rotation[1])
        .rotateZ(rotation[2])
        .translate(...position)
      return builder.add(role, geometry)
    },
    tube(role, points, radius) {
      const curve = new CatmullRomCurve3(
        points.map((point) => new Vector3(...point)),
        false,
        'centripetal',
      )
      return builder.add(
        role,
        new TubeGeometry(
          curve,
          Math.max(2, (points.length - 1) * (high ? 5 : 2)),
          radius,
          high ? 8 : 5,
          false,
        ),
      )
    },
    ellipsoid(role, radii, position) {
      return builder.add(
        role,
        new SphereGeometry(1, high ? 20 : 10, high ? 12 : 6)
          .scale(...radii)
          .translate(...position),
      )
    },
    patch(role, grid, flip = false) {
      return builder.add(role, surface(grid, flip))
    },
    panel(role, points, thickness = 0.008) {
      const vertices = points.map((point) => new Vector3(...point))
      const origin = vertices[0]
      const x = vertices[1].clone().sub(origin).normalize()
      const normal = x
        .clone()
        .cross(vertices[2].clone().sub(origin))
        .normalize()
      const y = normal.clone().cross(x).normalize()
      const shape = new Shape(
        vertices.map((point) => {
          const offset = point.clone().sub(origin)
          return new Vector2(offset.dot(x), offset.dot(y))
        }),
      )
      const geometry = new ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: false,
        steps: 1,
      })
      geometry.translate(0, 0, -thickness / 2)
      geometry.applyMatrix4(
        new Matrix4().makeBasis(x, y, normal).setPosition(origin),
      )
      return builder.add(role, geometry)
    },
    mirror(side, base, tip, size = [0.12, 0.055, 0.08]) {
      const bend = [
        base[0] + (tip[0] - base[0]) * 0.42,
        tip[1] - size[1] * 0.25,
        base[2],
      ]
      builder.box(
        'carbon',
        [0.045, 0.024, 0.047],
        base,
        [0, 0, side * -0.15],
        0.005,
      )
      builder.tube('carbon', [base, bend, tip], 0.012)
      const segments = high ? 32 : 16,
        cut = Math.acos(0.5),
        yaw = side * -0.12
      const aperture = Math.sin(cut) / 2,
        depth = size[2] / 4
      const place = (geometry) => geometry.rotateY(yaw).translate(...tip)
      builder.add(
        'paint',
        place(
          new SphereGeometry(
            1,
            segments,
            high ? 12 : 6,
            0,
            Math.PI * 2,
            cut,
            Math.PI - cut,
          )
            .rotateX(Math.PI / 2)
            .scale(size[0] / 2, size[1] / 2, size[2] / 2),
        ),
      )
      builder.add(
        'carbon',
        place(
          new RingGeometry(0.9, 1, segments)
            .scale(size[0] * aperture, size[1] * aperture, 1)
            .translate(0, 0, depth),
        ),
      )
      builder.add(
        'mirror',
        place(
          new CircleGeometry(0.9, segments)
            .scale(size[0] * aperture, size[1] * aperture, 1)
            .translate(0, 0, depth),
        ),
      )
      mirrors.push({ side, base, tip, size })
    },
    body(
      sections,
      wheels,
      {
        archClearance = 0.035,
        archLip = 0.025,
        segments = high ? 84 : 40,
        frontSweep = 0,
        rearSweep = 0,
      } = {},
    ) {
      const first = sections[0][0],
        last = sections.at(-1)[0]
      const zValues = new Set(sections.map((section) => section[0]))
      for (let i = 0; i <= segments; i++)
        zValues.add(first + ((last - first) * i) / segments)
      for (const wheel of wheels) {
        const radius = wheel.radius + archClearance
        for (let i = 0; i <= (high ? 20 : 10); i++) {
          const z =
            wheel.z + Math.cos((i * Math.PI) / (high ? 20 : 10)) * radius
          if (z > first && z < last) zValues.add(z)
        }
      }
      const sample = (z) => {
        const [, width, center, shoulder, bottom] = sampleSections(sections, z)
        let cut = bottom
        for (const wheel of wheels) {
          const dz = z - wheel.z,
            radius = wheel.radius + archClearance
          if (Math.abs(dz) <= radius + 1e-8)
            cut = Math.max(
              cut,
              wheel.y + Math.sqrt(Math.max(0, radius ** 2 - dz ** 2)),
            )
        }
        const crest = Math.max(shoulder, cut + archLip)
        return {
          z,
          width,
          center,
          shoulder: crest,
          bottom: cut,
          radius: Math.min(0.032, (crest - cut) * 0.44),
        }
      }
      const warpZ = (row, x) => {
        const edge = (Math.abs(x) / row.width) ** 4
        const front = Math.max(0, 1 - (row.z - first) / 0.24) ** 2
        const rear = Math.max(0, 1 - (last - row.z) / 0.22) ** 2
        return row.z + frontSweep * edge * front - rearSweep * edge * rear
      }
      const topPoint = (x, z) => {
        const row = sample(z),
          crestWidth = row.width - row.radius
        let y
        if (Math.abs(x) <= crestWidth) {
          const blend =
            Math.sin(((Math.abs(x) / crestWidth) * Math.PI) / 2) ** 4
          y = row.center + (row.shoulder - row.center) * blend
        } else {
          const dx = Math.min(row.radius, Math.abs(x) - crestWidth)
          y =
            row.shoulder -
            row.radius +
            Math.sqrt(Math.max(0, row.radius ** 2 - dx ** 2))
        }
        return [x, y, warpZ(row, x)]
      }
      const sidePoint = (side, z, y) => {
        const row = sample(z)
        const t = Math.max(
          0,
          Math.min(
            1,
            (y - row.bottom) / (row.shoulder - row.radius - row.bottom),
          ),
        )
        const x =
          side *
          (row.width - 0.018 * (1 - t) ** 2 + 0.004 * Math.sin(t * Math.PI))
        return [x, y, warpZ(row, x)]
      }
      const rows = [...zValues].sort((a, b) => a - b).map(sample)
      const cross = high ? 20 : 10
      const roundSteps = high ? 5 : 3
      builder.patch(
        'paint',
        rows.map((row) => {
          const ring = []
          for (const t of [0, 0.22, 0.5, 0.78, 1])
            ring.push(
              sidePoint(
                -1,
                row.z,
                row.bottom + (row.shoulder - row.radius - row.bottom) * t,
              ),
            )
          for (let i = 1; i <= roundSteps; i++) {
            const angle = ((i / roundSteps) * Math.PI) / 2,
              x = -(row.width - row.radius + row.radius * Math.cos(angle))
            ring.push([
              x,
              row.shoulder - row.radius + row.radius * Math.sin(angle),
              warpZ(row, x),
            ])
          }
          for (let i = 1; i <= cross; i++)
            ring.push(
              topPoint(((i / cross) * 2 - 1) * (row.width - row.radius), row.z),
            )
          for (let i = 1; i <= roundSteps; i++) {
            const angle = ((1 - i / roundSteps) * Math.PI) / 2,
              x = row.width - row.radius + row.radius * Math.cos(angle)
            ring.push([
              x,
              row.shoulder - row.radius + row.radius * Math.sin(angle),
              warpZ(row, x),
            ])
          }
          for (const t of [0.78, 0.5, 0.22, 0])
            ring.push(
              sidePoint(
                1,
                row.z,
                row.bottom + (row.shoulder - row.radius - row.bottom) * t,
              ),
            )
          return ring
        }),
      )
      for (const side of [-1, 1]) {
        builder.patch(
          'carbon',
          rows.map((row) => [
            [
              side * (row.width - 0.07),
              row.bottom + 0.007,
              warpZ(row, side * (row.width - 0.07)),
            ],
            sidePoint(side, row.z, row.bottom),
          ]),
          side < 0,
        )
      }
      for (const [row, flip] of [
        [rows[0], false],
        [rows.at(-1), true],
      ]) {
        builder.patch(
          'paint',
          [0, 0.25, 0.5, 0.75, 1].map((t) =>
            Array.from({ length: cross + 1 }, (_, i) => {
              const x =
                ((i / cross) * 2 - 1) * (row.width - 0.018 * (1 - t) ** 2)
              const [, top] = topPoint(x, row.z)
              return [x, row.bottom + (top - row.bottom) * t, warpZ(row, x)]
            }),
          ),
          flip,
        )
      }
      return { sample, topPoint, sidePoint }
    },
    finish(metadata = {}) {
      return { parts, ...metadata, anchors: { ...metadata.anchors, mirrors } }
    },
  }
  return builder
}
