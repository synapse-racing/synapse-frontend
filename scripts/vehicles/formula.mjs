import { BufferGeometry, Float32BufferAttribute } from 'three'
import { createBuilder, surface } from './modeling.mjs'

function endCap(ring, reverse) {
  const positions = ring.flat()
  const center = ring.reduce(
    (sum, point) => sum.map((value, axis) => value + point[axis] / ring.length),
    [0, 0, 0],
  )
  positions.push(...center)
  const indices = []
  for (let index = 0; index < ring.length - 1; index++) {
    indices.push(
      ...(reverse
        ? [ring.length, index + 1, index]
        : [ring.length, index, index + 1]),
    )
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

// A closed longitudinal skin, with an optional open mouth for cooling ducts.
function shell(
  builder,
  role,
  sections,
  { openFront = false, sides = builder.high ? 24 : 12 } = {},
) {
  const rings = sections.map(([z, centerX, width, bottom, top]) =>
    Array.from({ length: sides + 1 }, (_, index) => {
      const angle = (index / sides) * Math.PI * 2
      const cosine = Math.cos(angle),
        sine = Math.sin(angle)
      return [
        centerX + width * Math.sign(cosine) * Math.abs(cosine) ** 0.8,
        (bottom + top) / 2 +
          ((top - bottom) / 2) * Math.sign(sine) * Math.abs(sine) ** 0.82,
        z,
      ]
    }),
  )
  builder.add(role, surface(rings, true))
  if (!openFront) builder.add(role, endCap(rings[0], true))
  builder.add(role, endCap(rings.at(-1), false))
}

function airfoil(
  builder,
  role,
  { width, z, y, chord, rise = 0, camber = 0.014, thickness = 0.008 },
) {
  const spanSteps = builder.high ? 20 : 8
  const chordSteps = builder.high ? 10 : 4
  const top = [],
    bottom = []
  for (let row = 0; row <= chordSteps; row++) {
    const t = row / chordSteps
    const upper = [],
      lower = []
    for (let column = 0; column <= spanSteps; column++) {
      const u = (column / spanSteps) * 2 - 1
      const height = y + rise * u ** 2 + camber * Math.sin(t * Math.PI)
      const point = [(u * width) / 2, height, z + t * chord + 0.012 * u ** 2]
      upper.push(point)
      lower.push([
        point[0],
        height - thickness * (0.35 + 0.65 * Math.sin(t * Math.PI)),
        point[2],
      ])
    }
    top.push(upper)
    bottom.push(lower)
  }
  builder.patch(role, top)
  builder.patch(role, bottom, true)
  for (const [column, flip] of [
    [0, true],
    [spanSteps, false],
  ]) {
    builder.patch(
      role,
      top.map((row, index) => [row[column], bottom[index][column]]),
      flip,
    )
  }
  builder.patch(role, [bottom[0], top[0]])
  builder.patch(role, [bottom.at(-1), top.at(-1)], true)
}

export function buildFormula(detail = 'high') {
  const b = createBuilder(detail)
  const wheels = [-1, 1].flatMap((side) => [
    {
      x: side * 0.455,
      y: 0.21,
      z: -0.76,
      radius: 0.21,
      width: 0.16,
      front: true,
      style: 'aero',
    },
    {
      x: side * 0.455,
      y: 0.21,
      z: 0.75,
      radius: 0.21,
      width: 0.2,
      front: false,
      style: 'aero',
    },
  ])

  b.panel(
    'carbon',
    [
      [-0.28, 0.078, -0.42],
      [-0.36, 0.078, -0.27],
      [-0.36, 0.078, 0.37],
      [-0.25, 0.078, 0.91],
      [0.25, 0.078, 0.91],
      [0.36, 0.078, 0.37],
      [0.36, 0.078, -0.27],
      [0.28, 0.078, -0.42],
    ],
    0.016,
  )

  shell(b, 'paint', [
    [-1.105, 0, 0.044, 0.145, 0.195],
    [-1.025, 0, 0.057, 0.151, 0.213],
    [-0.89, 0, 0.072, 0.138, 0.245],
    [-0.74, 0, 0.091, 0.12, 0.274],
    [-0.55, 0, 0.118, 0.105, 0.306],
    [-0.36, 0, 0.153, 0.105, 0.333],
    [-0.22, 0, 0.168, 0.112, 0.343],
    [-0.18, 0, 0.159, 0.115, 0.337],
  ])
  shell(b, 'carbon', [
    [-0.19, 0, 0.119, 0.105, 0.236],
    [0.12, 0, 0.143, 0.104, 0.238],
    [0.4, 0, 0.138, 0.108, 0.24],
    [0.77, 0, 0.082, 0.116, 0.237],
    [0.98, 0, 0.056, 0.13, 0.22],
  ])

  // The cockpit stays open: separate shoulders surround a recessed inner tub.
  for (const side of [-1, 1]) {
    shell(b, 'paint', [
      [-0.2, side * 0.127, 0.038, 0.184, 0.333],
      [-0.07, side * 0.143, 0.04, 0.172, 0.335],
      [0.12, side * 0.144, 0.04, 0.174, 0.337],
      [0.29, side * 0.13, 0.041, 0.185, 0.358],
      [0.38, side * 0.105, 0.043, 0.19, 0.366],
    ])
    const pod = [
      [-0.35, side * 0.237, 0.077, 0.205, 0.302],
      [-0.29, side * 0.25, 0.094, 0.183, 0.319],
      [-0.12, side * 0.248, 0.101, 0.145, 0.32],
      [0.09, side * 0.236, 0.107, 0.128, 0.299],
      [0.31, side * 0.213, 0.102, 0.12, 0.265],
      [0.51, side * 0.178, 0.083, 0.122, 0.226],
      [0.69, side * 0.136, 0.056, 0.133, 0.204],
    ]
    shell(b, 'paint', pod, { openFront: true })
    shell(
      b,
      'carbon',
      [
        [-0.352, side * 0.237, 0.068, 0.211, 0.294],
        [-0.307, side * 0.238, 0.059, 0.215, 0.288],
      ],
      { openFront: true, sides: b.high ? 20 : 10 },
    )
    b.patch(
      'accent',
      pod.slice(1, -1).map(([z, centerX, , , top]) => [
        [centerX - 0.022, top + 0.0015, z],
        [centerX + 0.022, top + 0.0015, z],
      ]),
    )
    b.tube(
      'carbon',
      [
        [side * 0.35, 0.09, -0.31],
        [side * 0.353, 0.09, 0.2],
        [side * 0.3, 0.09, 0.57],
      ],
      0.009,
    )
    b.mirror(
      side,
      [side * 0.145, 0.315, -0.22],
      [side * 0.263, 0.371, -0.245],
      [0.108, 0.044, 0.063],
    )

    const frontHub = side * 0.383
    const rearHub = side * 0.366
    const frontLinks = [
      [
        [side * 0.093, 0.159, -0.91],
        [frontHub, 0.183, -0.76],
        [side * 0.137, 0.16, -0.47],
      ],
      [
        [side * 0.094, 0.243, -0.88],
        [frontHub, 0.25, -0.76],
        [side * 0.126, 0.276, -0.49],
      ],
      [
        [frontHub, 0.17, -0.76],
        [side * 0.108, 0.3, -0.53],
      ],
    ]
    const rearLinks = [
      [
        [side * 0.12, 0.16, 0.49],
        [rearHub, 0.18, 0.75],
        [side * 0.074, 0.164, 0.96],
      ],
      [
        [side * 0.12, 0.28, 0.5],
        [rearHub, 0.255, 0.75],
        [side * 0.068, 0.225, 0.96],
      ],
      [
        [rearHub, 0.17, 0.75],
        [side * 0.112, 0.3, 0.54],
      ],
    ]
    for (const points of [...frontLinks, ...rearLinks])
      b.tube('carbon', points, 0.01)
    for (const [hubX, z] of [
      [frontHub, -0.76],
      [rearHub, 0.75],
    ]) {
      b.tube(
        'metal',
        [
          [hubX, 0.18, z],
          [hubX, 0.255, z],
        ],
        0.016,
      )
      b.tube(
        'metal',
        [
          [hubX, 0.21, z],
          [side * 0.455, 0.21, z],
        ],
        0.018,
      )
    }

    b.tube(
      'carbon',
      [
        [side * 0.107, 0.35, 0.285],
        [side * 0.118, 0.461, 0.205],
        [side * 0.122, 0.474, 0.055],
        [side * 0.092, 0.473, -0.103],
        [0, 0.465, -0.191],
      ],
      0.0115,
    )
  }

  const rimSteps = b.high ? 40 : 20
  const tub = [0.337, 0.247].map((y) =>
    Array.from({ length: rimSteps + 1 }, (_, index) => {
      const angle = (index / rimSteps) * Math.PI * 2
      return [0.101 * Math.cos(angle), y, 0.055 + 0.239 * Math.sin(angle)]
    }),
  )
  b.patch('carbon', tub)
  b.ellipsoid('carbon', [0.089, 0.017, 0.201], [0, 0.246, 0.055])
  b.ellipsoid('carbon', [0.079, 0.089, 0.065], [0, 0.296, 0.167])
  b.ellipsoid('accent', [0.067, 0.07, 0.077], [0, 0.383, 0.111])
  const visor = Array.from({ length: b.high ? 5 : 3 }, (_, row) => {
    const v = row / (b.high ? 4 : 2)
    return Array.from({ length: b.high ? 17 : 9 }, (_, column) => {
      const angle = ((column / (b.high ? 16 : 8)) * 2 - 1) * 1.22
      const radius =
        0.069 * Math.sqrt(1 - ((0.388 + v * 0.023 - 0.383) / 0.07) ** 2)
      return [
        radius * Math.sin(angle),
        0.388 + v * 0.023,
        0.111 - (radius / 0.067) * 0.078 * Math.cos(angle),
      ]
    })
  })
  b.patch('glass', visor)
  b.tube(
    'carbon',
    [
      [0, 0.337, -0.183],
      [0, 0.398, -0.193],
      [0, 0.465, -0.191],
    ],
    0.012,
  )
  b.tube(
    'carbon',
    [
      [-0.052, 0.294, -0.092],
      [0, 0.32, -0.106],
      [0.052, 0.294, -0.092],
    ],
    0.009,
  )

  shell(b, 'paint', [
    [0.283, 0, 0.084, 0.242, 0.402],
    [0.355, 0, 0.094, 0.23, 0.475],
    [0.43, 0, 0.102, 0.218, 0.477],
    [0.56, 0, 0.101, 0.19, 0.417],
    [0.72, 0, 0.079, 0.163, 0.326],
    [0.9, 0, 0.054, 0.15, 0.243],
    [0.98, 0, 0.042, 0.145, 0.218],
  ])
  shell(
    b,
    'carbon',
    [
      [0.311, 0, 0.036, 0.387, 0.434],
      [0.34, 0, 0.032, 0.387, 0.433],
    ],
    { openFront: true, sides: b.high ? 20 : 10 },
  )
  b.panel(
    'accent',
    [
      [0, 0.477, 0.423],
      [0, 0.418, 0.56],
      [0, 0.327, 0.725],
      [0, 0.393, 0.615],
    ],
    0.009,
  )

  airfoil(b, 'carbon', {
    width: 1.064,
    z: -1.197,
    y: 0.087,
    chord: 0.173,
    rise: 0.031,
    camber: 0.017,
  })
  airfoil(b, 'accent', {
    width: 1.043,
    z: -1.112,
    y: 0.142,
    chord: 0.085,
    rise: 0.031,
    camber: 0.012,
    thickness: 0.006,
  })
  if (b.high)
    airfoil(b, 'carbon', {
      width: 1.035,
      z: -1.062,
      y: 0.179,
      chord: 0.043,
      rise: 0.019,
      camber: 0.006,
      thickness: 0.004,
    })
  for (const side of [-1, 1]) {
    b.tube(
      'carbon',
      [
        [side * 0.038, 0.164, -1.071],
        [side * 0.045, 0.109, -1.092],
      ],
      0.009,
    )
    b.panel(
      'paint',
      [
        [side * 0.535, 0.09, -1.19],
        [side * 0.535, 0.208, -1.16],
        [side * 0.535, 0.23, -1.075],
        [side * 0.535, 0.18, -1.015],
        [side * 0.535, 0.087, -1.035],
      ],
      0.012,
    )
    b.tube(
      'carbon',
      [
        [side * 0.06, 0.19, 0.83],
        [side * 0.078, 0.331, 0.96],
        [side * 0.086, 0.435, 1.071],
      ],
      0.014,
    )
    b.panel(
      'paint',
      [
        [side * 0.388, 0.341, 0.969],
        [side * 0.388, 0.485, 0.989],
        [side * 0.388, 0.494, 1.177],
        [side * 0.388, 0.381, 1.181],
      ],
      0.013,
    )
  }
  airfoil(b, 'carbon', {
    width: 0.775,
    z: 0.984,
    y: 0.422,
    chord: 0.174,
    camber: 0.023,
    thickness: 0.01,
  })
  airfoil(b, 'accent', {
    width: 0.775,
    z: 1.063,
    y: 0.473,
    chord: 0.105,
    camber: 0.012,
    thickness: 0.007,
  })
  airfoil(b, 'carbon', {
    width: 0.46,
    z: 0.809,
    y: 0.167,
    chord: 0.167,
    camber: 0.015,
    thickness: 0.008,
  })

  for (const x of [-0.2, -0.1, 0, 0.1, 0.2]) {
    b.panel(
      'carbon',
      [
        [x, 0.073, 0.62],
        [x, 0.074, 0.927],
        [x, 0.158, 0.964],
        [x, 0.127, 0.825],
      ],
      0.006,
    )
  }
  b.box(
    'rearLights',
    [0.046, 0.035, 0.012],
    [0, 0.203, 0.992],
    [0, 0, 0],
    0.006,
  )
  if (b.high) {
    for (const side of [-1, 1]) {
      for (let index = 0; index < 5; index++) {
        const z = 0.22 + index * 0.045
        b.tube(
          'carbon',
          [
            [side * 0.205, 0.29 - index * 0.007, z],
            [side * 0.267, 0.267 - index * 0.009, z + 0.012],
          ],
          0.004,
        )
      }
    }
  }

  return b.finish({
    wheels,
    decals: [
      {
        position: [0, 0.295, -0.626],
        normal: [0, 0.982, -0.189],
        width: 0.106,
        height: 0.158,
      },
    ],
    anchors: {
      cockpit: { position: [0, 0.337, 0.055], width: 0.202, length: 0.478 },
      suspension: wheels.map((wheel) => ({
        body: [Math.sign(wheel.x) * 0.105, 0.24, wheel.z],
        hub: [wheel.x, wheel.y, wheel.z],
      })),
    },
  })
}
