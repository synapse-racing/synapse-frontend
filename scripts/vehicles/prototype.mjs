import { createBuilder } from './modeling.mjs'

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const gaussian = (value, center, spread) =>
  Math.exp(-(((value - center) / spread) ** 2))

function interpolate(sections, z) {
  let i = sections.findIndex((section) => section[0] >= z)
  if (i <= 0) return sections[i < 0 ? sections.length - 1 : 0].slice(1)
  const a = sections[i - 1],
    b = sections[i]
  const before = sections[Math.max(0, i - 2)],
    after = sections[Math.min(sections.length - 1, i + 1)]
  const span = b[0] - a[0],
    t = (z - a[0]) / span
  return a.slice(1).map((value, column) => {
    const key = column + 1
    const m0 = (b[key] - before[key]) / (b[0] - before[0])
    const m1 = (after[key] - a[key]) / (after[0] - a[0])
    return (
      (2 * t ** 3 - 3 * t ** 2 + 1) * value +
      (t ** 3 - 2 * t ** 2 + t) * span * m0 +
      (-2 * t ** 3 + 3 * t ** 2) * b[key] +
      (t ** 3 - t ** 2) * span * m1
    )
  })
}

const deck = [
  [-1.16, 0.17],
  [-0.94, 0.222],
  [-0.48, 0.285],
  [-0.12, 0.317],
  [0.32, 0.321],
  [0.73, 0.294],
  [0.99, 0.254],
  [1.16, 0.203],
]

function bodyWidth(z) {
  return (
    0.447 +
    0.096 * Math.max(gaussian(z, -0.73, 0.33), gaussian(z, 0.72, 0.35)) -
    0.071 * smooth(1.01, 1.16, Math.abs(z))
  )
}

function bodyTop(x, z) {
  const u = clamp(Math.abs(x) / bodyWidth(z))
  const center = interpolate(deck, z)[0]
  const shoulder =
    0.282 +
    0.175 * Math.max(gaussian(z, -0.73, 0.32), gaussian(z, 0.72, 0.35)) -
    0.074 * smooth(0.96, 1.16, Math.abs(z))
  return (
    center +
    (shoulder - center) * smooth(0.22, 0.83, u) +
    0.012 * Math.sin(Math.PI * u) -
    0.012 * smooth(0.82, 1, u)
  )
}

function sampleRange(start, end, steps) {
  return Array.from(
    { length: steps + 1 },
    (_, i) => start + ((end - start) * i) / steps,
  )
}

function bodyRibbon(b, role, positions, width, height = 0.0025) {
  b.patch(
    role,
    positions.map(([x, z]) =>
      [-1, 1].map((side) => {
        const px = x + (side * width) / 2
        return [px, bodyTop(px, z) + height, z]
      }),
    ),
  )
}

function makeBody(b, wheels) {
  const steps = b.high ? 82 : 38
  const archRadius = 0.223
  const opening = [-0.265, 0.32]
  const zValues = new Set(sampleRange(-1.16, 1.16, steps))
  for (const z of [...deck.map((section) => section[0]), ...opening])
    zValues.add(z)
  for (const z of [-0.73, 0.72]) {
    for (const theta of sampleRange(0, Math.PI, b.high ? 24 : 12))
      zValues.add(z + Math.cos(theta) * archRadius)
    zValues.add(z - archRadius - 0.002)
    zValues.add(z + archRadius + 0.002)
  }
  const rows = [...zValues].sort((a, c) => a - c)
  const bottom = (z) => {
    let y = 0.106
    for (const wheelZ of [-0.73, 0.72]) {
      const d = z - wheelZ
      if (Math.abs(d) <= archRadius + 1e-8)
        y = Math.max(
          y,
          0.205 + Math.sqrt(Math.max(0, archRadius ** 2 - d ** 2)),
        )
    }
    return y
  }
  const topGrid = rows.map((z) =>
    sampleRange(-1, 1, b.high ? 24 : 14).map((u) => {
      const x = u * bodyWidth(z)
      return [x, bodyTop(x, z), z]
    }),
  )
  b.patch('paint', topGrid)

  const intake = (z) => {
    const t = clamp((z - opening[0]) / (opening[1] - opening[0]))
    const shape = Math.sin(Math.PI * t)
    return [0.163 - 0.027 * shape, 0.218 + 0.061 * shape]
  }
  for (const side of [-1, 1]) {
    const outside = (z) => side * (bodyWidth(z) - 0.006)
    const row = (z, low, high) => [
      [side * (bodyWidth(z) - 0.018), low, z],
      [outside(z), low + (high - low) * 0.34, z],
      [side * bodyWidth(z), high, z],
    ]
    for (const range of [
      [-1.16, opening[0]],
      [opening[1], 1.16],
    ]) {
      b.patch(
        'paint',
        rows
          .filter((z) => z >= range[0] && z <= range[1])
          .map((z) => row(z, bottom(z), bodyTop(bodyWidth(z), z))),
        side > 0,
      )
    }
    const ductRows = rows.filter((z) => z >= opening[0] && z <= opening[1])
    b.patch(
      'paint',
      ductRows.map((z) => row(z, bottom(z), intake(z)[0])),
      side > 0,
    )
    b.patch(
      'paint',
      ductRows.map((z) => row(z, intake(z)[1], bodyTop(bodyWidth(z), z))),
      side > 0,
    )
    b.patch(
      'carbon',
      ductRows.map((z) =>
        intake(z).map((y) => [side * (bodyWidth(z) - 0.065), y, z]),
      ),
      side > 0,
    )
    for (const edge of [0, 1]) {
      b.patch(
        'carbon',
        ductRows.map((z) => [
          [side * (bodyWidth(z) - 0.065), intake(z)[edge], z],
          [side * bodyWidth(z), intake(z)[edge], z],
        ]),
        side > 0 !== edge > 0,
      )
    }
    for (const z of opening) {
      b.patch(
        'carbon',
        intake(z).map((y) => [
          [side * (bodyWidth(z) - 0.065), y, z],
          [side * bodyWidth(z), y, z],
        ]),
        side > 0 !== (z === opening[0]),
      )
    }
    for (const z of b.high ? [-0.12, 0.06, 0.22] : [0.05]) {
      const [low, high] = intake(z)
      b.box(
        'carbon',
        [0.055, high - low - 0.012, 0.008],
        [side * (bodyWidth(z) - 0.028), (low + high) / 2, z],
        [0, 0, side * 0.12],
        0.002,
      )
    }
    b.patch(
      'accent',
      ductRows.map((z) => [
        [side * (bodyWidth(z) + 0.001), intake(z)[1] + 0.004, z],
        [side * (bodyWidth(z) + 0.001), intake(z)[1] + 0.012, z],
      ]),
      side > 0,
    )

    for (const wheel of wheels.filter((wheel) => Math.sign(wheel.x) === side)) {
      const angles = sampleRange(0, Math.PI, b.high ? 28 : 14)
      b.patch(
        'paint',
        angles.map((theta) =>
          [archRadius, archRadius + 0.014].map((radius) => {
            const z = wheel.z + Math.cos(theta) * radius
            return [
              side * (bodyWidth(z) + 0.001),
              wheel.y + Math.sin(theta) * radius,
              z,
            ]
          }),
        ),
        side < 0,
      )
      b.patch(
        'carbon',
        angles.map((theta) => {
          const z = wheel.z + Math.cos(theta) * archRadius
          const y = wheel.y + Math.sin(theta) * archRadius
          return [
            [side * (bodyWidth(z) - 0.072), y + 0.003, z],
            [side * (bodyWidth(z) - 0.001), y, z],
          ]
        }),
        side > 0,
      )
    }
  }

  for (const z of [-1.16, 1.16]) {
    b.patch(
      'paint',
      [
        sampleRange(-1, 1, b.high ? 24 : 14).map((u) => [
          u * (bodyWidth(z) - 0.018),
          0.106,
          z,
        ]),
        sampleRange(-1, 1, b.high ? 24 : 14).map((u) => [
          u * bodyWidth(z),
          bodyTop(u * bodyWidth(z), z),
          z,
        ]),
      ],
      z > 0,
    )
  }
}

function makeCanopy(b) {
  const sections = [
    [-0.48, 0.035, 0.297, 0.304],
    [-0.37, 0.138, 0.31, 0.402],
    [-0.19, 0.194, 0.325, 0.543],
    [0.02, 0.204, 0.334, 0.596],
    [0.22, 0.177, 0.337, 0.582],
    [0.43, 0.117, 0.329, 0.486],
    [0.61, 0.035, 0.316, 0.35],
    [0.65, 0.01, 0.31, 0.319],
  ]
  const zSamples = sampleRange(-0.48, 0.65, b.high ? 40 : 20)
  const canopy = (u, z, offset = 0) => {
    const [width, base, peak] = interpolate(sections, z)
    return [
      width * u,
      base + (peak - base) * Math.sqrt(Math.max(0, 1 - u * u)) + offset,
      z,
    ]
  }
  b.patch(
    'glass',
    zSamples.map((z) =>
      sampleRange(-1, 1, b.high ? 26 : 14).map((u) => canopy(u, z)),
    ),
  )
  for (const side of [-1, 1]) {
    b.tube(
      'carbon',
      zSamples
        .filter((_, i) => i % (b.high ? 4 : 2) === 0)
        .map((z) => canopy(side, z, 0.003)),
      0.008,
    )
    const railZ = sampleRange(-0.36, 0.38, b.high ? 12 : 7)
    b.patch(
      'paint',
      railZ.map((z) =>
        [side * 0.79, side * 0.855].map((u) => canopy(u, z, 0.005)),
      ),
      side < 0,
    )
  }
  b.tube(
    'carbon',
    sampleRange(-1, 1, b.high ? 12 : 8).map((u) => canopy(u, 0.32, 0.004)),
    0.007,
  )
  b.patch(
    'paint',
    sampleRange(-0.1, 0.43, b.high ? 20 : 10).map((z) =>
      [-0.15, 0.15].map((u) => canopy(u, z, 0.004)),
    ),
  )
  b.patch(
    'accent',
    sampleRange(-0.09, 0.41, b.high ? 20 : 10).map((z) =>
      [-0.052, 0.052].map((u) => canopy(u, z, 0.006)),
    ),
  )
  if (b.high) {
    b.tube(
      'carbon',
      [
        [-0.005, 0.417, -0.347],
        [0.005, 0.478, -0.27],
        [0.05, 0.507, -0.235],
      ],
      0.004,
    )
    b.tube(
      'metal',
      [
        [0.018, 0.594, 0.11],
        [0.018, 0.667, 0.12],
      ],
      0.0025,
    )
  }
}

function makeAero(b) {
  b.panel(
    'carbon',
    [
      [-0.295, 0.083, -1.16],
      [-0.335, 0.083, -0.82],
      [-0.322, 0.083, 0.81],
      [-0.35, 0.083, 1.1],
      [0.35, 0.083, 1.1],
      [0.322, 0.083, 0.81],
      [0.335, 0.083, -0.82],
      [0.295, 0.083, -1.16],
    ],
    0.018,
  )
  b.panel(
    'carbon',
    [
      [-0.43, 0.088, -1.195],
      [-0.535, 0.088, -1.09],
      [-0.535, 0.088, -0.992],
      [-0.28, 0.088, -1.015],
      [0.28, 0.088, -1.015],
      [0.535, 0.088, -0.992],
      [0.535, 0.088, -1.09],
      [0.43, 0.088, -1.195],
    ],
    0.018,
  )
  for (const side of [-1, 1]) {
    b.panel(
      'carbon',
      [
        [side * 0.32, 0.083, -0.487],
        [side * 0.48, 0.083, -0.47],
        [side * 0.511, 0.083, 0.42],
        [side * 0.49, 0.083, 0.485],
        [side * 0.32, 0.083, 0.479],
      ],
      0.016,
    )
    b.tube(
      'accent',
      [
        [side * 0.48, 0.097, -0.46],
        [side * 0.492, 0.097, -0.02],
        [side * 0.506, 0.097, 0.4],
      ],
      0.005,
    )
    b.panel(
      'carbon',
      [
        [side * 0.515, 0.09, -1.11],
        [side * 0.515, 0.143, -1.06],
        [side * 0.515, 0.14, -0.998],
        [side * 0.515, 0.09, -0.998],
      ],
      0.008,
    )

    b.panel(
      'carbon',
      [
        [side * 0.225, 0.316, 0.64],
        [side * 0.225, 0.396, 0.768],
        [side * 0.225, 0.626, 0.888],
        [side * 0.225, 0.643, 1.065],
        [side * 0.225, 0.622, 1.065],
        [side * 0.225, 0.604, 0.93],
        [side * 0.225, 0.377, 0.828],
        [side * 0.225, 0.316, 0.765],
      ],
      0.02,
    )
    b.box(
      'metal',
      [0.054, 0.018, 0.082],
      [side * 0.225, 0.324, 0.7],
      [0, 0, 0],
      0.005,
    )
  }

  const wingPoint = (x, chord, underside) => {
    const z = 0.963 + chord * 0.196 + 0.027 * (Math.abs(x) / 0.55) ** 2
    const camber = 0.017 * Math.sin(chord * Math.PI) + 0.014 * chord
    return [
      x,
      0.607 +
        camber -
        (underside ? 0.013 * Math.sin(chord * Math.PI) + 0.004 : 0),
      z,
    ]
  }
  for (const underside of [false, true]) {
    b.patch(
      'carbon',
      sampleRange(0, 1, b.high ? 10 : 5).map((chord) =>
        sampleRange(-0.55, 0.55, b.high ? 18 : 10).map((x) =>
          wingPoint(x, chord, underside),
        ),
      ),
      underside,
    )
  }
  b.patch(
    'accent',
    sampleRange(0.79, 0.91, 2).map((chord) =>
      sampleRange(-0.54, 0.54, b.high ? 18 : 10).map((x) => {
        const p = wingPoint(x, chord, false)
        p[1] += 0.002
        return p
      }),
    ),
  )
  for (const side of [-1, 1]) {
    b.panel(
      'paint',
      [
        [side * 0.554, 0.579, 0.967],
        [side * 0.554, 0.656, 0.978],
        [side * 0.554, 0.653, 1.182],
        [side * 0.554, 0.577, 1.174],
      ],
      0.011,
    )
  }
  b.panel(
    'paint',
    [
      [0, 0.505, 0.335],
      [0, 0.568, 0.47],
      [0, 0.561, 0.94],
      [0, 0.502, 1.05],
      [0, 0.275, 1.035],
      [0, 0.327, 0.47],
    ],
    0.013,
  )
  b.panel(
    'accent',
    [
      [0, 0.568, 0.47],
      [0, 0.561, 0.94],
      [0, 0.543, 0.972],
      [0, 0.548, 0.485],
    ],
    0.015,
  )

  b.patch('carbon', [
    [
      [-0.345, 0.073, 0.91],
      [0.345, 0.073, 0.91],
    ],
    [
      [-0.372, 0.143, 1.175],
      [0.372, 0.143, 1.175],
    ],
  ])
  for (const x of b.high ? [-0.31, -0.155, 0, 0.155, 0.31] : [-0.28, 0, 0.28]) {
    b.panel(
      'carbon',
      [
        [x, 0.069, 0.923],
        [x, 0.136, 1.18],
        [x, 0.075, 1.18],
        [x, 0.06, 0.956],
      ],
      0.008,
    )
  }
}

function makeLightingAndDetails(b) {
  b.box('carbon', [0.34, 0.039, 0.019], [0, 0.128, -1.16], [0, 0, 0], 0.008)
  if (b.high) {
    for (const x of [-0.12, -0.06, 0, 0.06, 0.12])
      b.box(
        'metal',
        [0.004, 0.026, 0.006],
        [x, 0.129, -1.173],
        [0, 0, 0],
        0.001,
      )
  }
  for (const side of [-1, 1]) {
    const lampZ = sampleRange(-1.105, -0.968, b.high ? 10 : 5)
    const lampGrid = lampZ.map((z) => {
      const taper = smooth(-1.105, -0.98, z)
      return [
        side * (0.324 + 0.012 * taper),
        side * (0.456 + 0.012 * taper),
      ].map((x) => [x, bodyTop(x, z) + 0.003, z])
    })
    b.patch('carbon', lampGrid, side < 0)
    for (const x of [0.35, 0.393, 0.435]) {
      b.tube(
        'lights',
        sampleRange(-1.085, -0.989, b.high ? 6 : 3).map((z) => [
          side * x,
          bodyTop(side * x, z) + 0.01,
          z,
        ]),
        0.006,
      )
    }

    b.box(
      'carbon',
      [0.213, 0.042, 0.015],
      [side * 0.255, 0.188, 1.16],
      [0, side * -0.035, 0],
      0.009,
    )
    b.box(
      'rearLights',
      [0.174, 0.011, 0.007],
      [side * 0.255, 0.192, 1.171],
      [0, side * -0.035, 0],
      0.004,
    )
    b.box(
      'rearLights',
      [0.025, 0.02, 0.007],
      [side * 0.18, 0.174, 1.171],
      [0, 0, 0],
      0.004,
    )

    const sweep = sampleRange(-1.105, -0.326, b.high ? 28 : 14).map((z) => {
      const x = side * bodyWidth(z) * (0.82 - 0.14 * smooth(-0.6, -0.326, z))
      return [x, z]
    })
    bodyRibbon(b, 'accent', sweep, 0.017)
    bodyRibbon(
      b,
      'accent',
      sampleRange(0.365, 1.08, b.high ? 22 : 12).map((z) => [
        side * bodyWidth(z) * 0.88,
        z,
      ]),
      0.014,
    )

    for (const z of b.high ? [-0.56, -0.507, -0.454, -0.401] : [-0.54, -0.44]) {
      b.patch(
        'carbon',
        [z - 0.009, z + 0.009].map((pz) =>
          sampleRange(0.325, 0.455, b.high ? 8 : 4).map((px) => [
            side * px,
            bodyTop(px, pz) + 0.002,
            pz,
          ]),
        ),
        side < 0,
      )
    }
    for (const z of b.high ? [0.895, 0.95, 1.005] : [0.93]) {
      b.patch(
        'carbon',
        [z - 0.008, z + 0.008].map((pz) =>
          sampleRange(0.33, 0.442, b.high ? 8 : 4).map((px) => [
            side * px,
            bodyTop(px, pz) + 0.002,
            pz,
          ]),
        ),
        side < 0,
      )
    }
    b.mirror(
      side,
      [side * 0.322, bodyTop(0.322, -0.25) + 0.005, -0.25],
      [side * 0.564, 0.443, -0.235],
      [0.12, 0.051, 0.084],
    )
    if (b.high) {
      b.tube(
        'metal',
        [
          [side * 0.139, 0.265, 1.055],
          [side * 0.139, 0.265, 1.145],
        ],
        0.018,
      )
      b.ellipsoid(
        'carbon',
        [0.0145, 0.0145, 0.002],
        [side * 0.139, 0.265, 1.147],
      )
      b.box(
        'metal',
        [0.017, 0.006, 0.032],
        [side * 0.306, bodyTop(0.306, 0.35) + 0.006, 0.35],
        [0, side * 0.12, 0],
        0.003,
      )
    }
  }
  bodyRibbon(
    b,
    'accent',
    sampleRange(-1.13, -0.49, b.high ? 24 : 12).map((z) => [0, z]),
    0.032,
  )
  b.box(
    'rearLights',
    [0.028, 0.028, 0.008],
    [0, 0.165, 1.168],
    [0, 0, 0],
    0.005,
  )
}

export function buildPrototype(detail = 'high') {
  const b = createBuilder(detail)
  const wheels = [-1, 1].flatMap((side) => [
    {
      x: side * 0.45,
      y: 0.205,
      z: -0.73,
      radius: 0.205,
      width: 0.17,
      front: true,
      style: 'aero',
    },
    {
      x: side * 0.45,
      y: 0.205,
      z: 0.72,
      radius: 0.205,
      width: 0.17,
      front: false,
      style: 'aero',
    },
  ])
  makeBody(b, wheels)
  makeCanopy(b)
  makeAero(b)
  makeLightingAndDetails(b)
  return b.finish({
    wheels,
    decals: [
      {
        position: [0, bodyTop(0, -0.805) + 0.007, -0.805],
        normal: [0, 0.99, -0.14],
        width: 0.14,
        height: 0.19,
      },
      {
        position: [-bodyWidth(0.405), 0.25, 0.405],
        normal: [-1, 0, 0],
        width: 0.14,
        height: 0.13,
      },
      {
        position: [bodyWidth(0.405), 0.25, 0.405],
        normal: [1, 0, 0],
        width: 0.14,
        height: 0.13,
      },
    ],
    anchors: {
      cockpit: [0, 0.54, 0.02],
      headlights: [
        [-0.393, 0.325, -1.04],
        [0.393, 0.325, -1.04],
      ],
      taillights: [
        [-0.255, 0.192, 1.171],
        [0.255, 0.192, 1.171],
      ],
    },
  })
}
