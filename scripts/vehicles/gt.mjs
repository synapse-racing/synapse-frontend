import { createBuilder } from './modeling.mjs'

const BODY = [
  [-1.16, 0.425, 0.285, 0.302, 0.145],
  [-1.09, 0.475, 0.325, 0.35, 0.135],
  [-0.98, 0.505, 0.358, 0.408, 0.125],
  [-0.82, 0.52, 0.378, 0.458, 0.125],
  [-0.69, 0.52, 0.386, 0.472, 0.125],
  [-0.51, 0.512, 0.402, 0.449, 0.125],
  [-0.34, 0.495, 0.421, 0.436, 0.125],
  [-0.1, 0.488, 0.427, 0.435, 0.125],
  [0.25, 0.495, 0.424, 0.441, 0.125],
  [0.48, 0.515, 0.421, 0.461, 0.125],
  [0.71, 0.52, 0.416, 0.476, 0.125],
  [0.88, 0.516, 0.405, 0.448, 0.132],
  [1.04, 0.488, 0.376, 0.409, 0.145],
  [1.16, 0.45, 0.342, 0.366, 0.155],
]

// z, roof center, roof half-width, belt half-width, belt height.
const CABIN = [
  [-0.385, 0.43, 0.371, 0.394, 0.426],
  [-0.3, 0.492, 0.344, 0.398, 0.433],
  [-0.16, 0.606, 0.315, 0.4, 0.437],
  [-0.045, 0.674, 0.296, 0.399, 0.439],
  [0.08, 0.689, 0.293, 0.398, 0.44],
  [0.26, 0.683, 0.299, 0.4, 0.441],
  [0.38, 0.65, 0.316, 0.403, 0.441],
  [0.54, 0.547, 0.347, 0.407, 0.439],
  [0.71, 0.431, 0.395, 0.41, 0.426],
]

function cabinSection(z) {
  const index = CABIN.findIndex((section) => section[0] >= z)
  if (index <= 0) return CABIN[index < 0 ? CABIN.length - 1 : 0]
  const a = CABIN[index - 1],
    c = CABIN[index]
  const previous = CABIN[Math.max(0, index - 2)]
  const next = CABIN[Math.min(CABIN.length - 1, index + 1)]
  const span = c[0] - a[0],
    t = (z - a[0]) / span
  const t2 = t * t,
    t3 = t2 * t
  return a.map((value, field) => {
    if (field === 0) return z
    const fromSlope = (c[field] - previous[field]) / (c[0] - previous[0])
    const toSlope = (next[field] - a[field]) / (next[0] - a[0])
    return (
      (2 * t3 - 3 * t2 + 1) * value +
      (t3 - 2 * t2 + t) * span * fromSlope +
      (-2 * t3 + 3 * t2) * c[field] +
      (t3 - t2) * span * toSlope
    )
  })
}

function range(from, to, segments) {
  return Array.from(
    { length: segments + 1 },
    (_, index) => from + ((to - from) * index) / segments,
  )
}

export function buildGt(detail = 'high') {
  const b = createBuilder(detail)
  const high = detail === 'high'
  const wheels = [-1, 1].flatMap((side) => [
    {
      x: side * 0.445,
      y: 0.205,
      z: -0.69,
      radius: 0.205,
      width: 0.15,
      front: true,
      style: 'mesh',
    },
    {
      x: side * 0.445,
      y: 0.205,
      z: 0.71,
      radius: 0.205,
      width: 0.15,
      front: false,
      style: 'mesh',
    },
  ])
  const body = b.body(BODY, wheels, {
    archClearance: 0.032,
    archLip: 0.025,
    segments: high ? 80 : 34,
    frontSweep: 0.06,
  })

  const topPoint = (x, z, lift = 0) => {
    const point = body.topPoint(x, z)
    point[1] += lift
    return point
  }
  const frontPoint = (x, y, lift = 0.006) => [
    x,
    y,
    -1.16 + 0.06 * (Math.abs(x) / 0.425) ** 4 - lift,
  ]
  const roofPoint = (z, ratio, lift = 0) => {
    const [, center, width] = cabinSection(z)
    return [ratio * width, center - 0.022 * Math.abs(ratio) ** 4 + lift, z]
  }
  const cabinSide = (side, z, height, lift = 0) => {
    const [, top, topWidth, bottomWidth, bottom] = cabinSection(z)
    const bulge = 0.006 * Math.sin(height * Math.PI)
    return [
      side * (bottomWidth + (topWidth - bottomWidth) * height + bulge + lift),
      bottom + (top - 0.022 - bottom) * height,
      z,
    ]
  }
  const topStrip = (role, side, rows, lift = 0.005) =>
    b.patch(
      role,
      rows.map(([z, inside, outside]) => {
        const edge = [
          topPoint(side * inside, z, lift),
          topPoint(side * outside, z, lift),
        ]
        return side < 0 ? edge.reverse() : edge
      }),
    )

  const cabinRows = range(-0.385, 0.71, high ? 40 : 20)
  b.patch(
    'paint',
    cabinRows.map((z) =>
      range(-1, 1, high ? 16 : 8).map((u) => roofPoint(z, u)),
    ),
  )
  for (const side of [-1, 1]) {
    b.patch(
      'paint',
      cabinRows.map((z) => range(0, 1, 4).map((t) => cabinSide(side, z, t))),
      side > 0,
    )
  }

  // Glass follows the same sculpted shell, leaving actual painted pillars and roof rails.
  for (const [start, end, width] of [
    [-0.345, -0.06, 0.89],
    [0.376, 0.655, 0.87],
  ]) {
    b.patch(
      'glass',
      range(start, end, high ? 15 : 8).map((z) =>
        range(-width, width, high ? 12 : 6).map((u) => roofPoint(z, u, 0.0025)),
      ),
    )
  }
  for (const side of [-1, 1]) {
    for (const [start, end] of [
      [-0.303, 0.166],
      [0.205, 0.564],
    ]) {
      b.patch(
        'glass',
        range(start, end, high ? 16 : 8).map((z) =>
          range(0.135, 0.865, 3).map((t) => cabinSide(side, z, t, 0.0025)),
        ),
        side > 0,
      )
    }
    b.patch(
      'carbon',
      range(0.171, 0.2, 1).map((z) =>
        [0.12, 0.89].map((t) => cabinSide(side, z, t, 0.003)),
      ),
      side > 0,
    )
    b.tube(
      'paint',
      range(-0.325, 0.595, high ? 12 : 6).map((z) =>
        cabinSide(side, z, 0.94, 0.001),
      ),
      0.007,
    )
    b.tube(
      'carbon',
      range(-0.325, 0.605, high ? 12 : 6).map((z) =>
        cabinSide(side, z, 0.075, 0.003),
      ),
      0.004,
    )

    const mirrorBase = cabinSide(side, -0.275, 0.36, 0.003)
    b.mirror(
      side,
      mirrorBase,
      [side * 0.555, 0.493, -0.315],
      [0.123, 0.052, 0.083],
    )

    topStrip('carbon', side, [
      [-1.107, 0.297, 0.412],
      [-1.065, 0.289, 0.454],
      [-0.995, 0.33, 0.478],
      [-0.971, 0.379, 0.472],
    ])
    topStrip(
      'lights',
      side,
      [
        [-1.093, 0.309, 0.406],
        [-1.069, 0.307, 0.445],
        [-1.052, 0.316, 0.449],
      ],
      0.008,
    )
    b.tube(
      'lights',
      [
        [0.346, -1.037],
        [0.376, -1.017],
        [0.456, -0.991],
      ].map(([x, z]) => topPoint(side * x, z, 0.01)),
      0.006,
    )

    topStrip(
      'carbon',
      side,
      [
        [-0.671, 0.189, 0.256],
        [-0.615, 0.176, 0.255],
        [-0.476, 0.169, 0.233],
      ],
      0.004,
    )
    if (high) {
      for (const z of [-0.632, -0.589, -0.546, -0.503]) {
        b.tube(
          'paint',
          [topPoint(side * 0.18, z, 0.009), topPoint(side * 0.243, z, 0.009)],
          0.004,
        )
      }
      b.tube(
        'paint',
        [-0.945, -0.81, -0.62, -0.445].map((z) =>
          topPoint(side * (0.125 + (z + 0.945) * 0.045), z, 0.002),
        ),
        0.0035,
      )
    }

    b.panel(
      'accent',
      [
        [side * 0.511, 0.123, -0.434],
        [side * 0.524, 0.112, -0.395],
        [side * 0.524, 0.112, 0.449],
        [side * 0.507, 0.159, 0.454],
        [side * 0.501, 0.155, -0.422],
      ],
      0.014,
    )
    b.panel(
      'carbon',
      [
        [side * 0.501, 0.177, 0.338],
        [side * 0.512, 0.187, 0.437],
        [side * 0.512, 0.319, 0.446],
        [side * 0.503, 0.294, 0.35],
      ],
      0.006,
    )

    if (high) {
      const doorPoint = (z, y) => {
        const point = body.sidePoint(side, z, y)
        point[0] += side * 0.002
        return point
      }
      b.tube(
        'carbon',
        [
          doorPoint(-0.319, 0.424),
          doorPoint(-0.358, 0.341),
          doorPoint(-0.343, 0.205),
          doorPoint(-0.278, 0.176),
          doorPoint(0.243, 0.176),
          doorPoint(0.3, 0.245),
          doorPoint(0.286, 0.416),
        ],
        0.0022,
      )
      b.box(
        'metal',
        [0.009, 0.012, 0.066],
        [side * 0.498, 0.392, 0.228],
        [0, 0, 0],
        0.004,
      )
    }
  }

  b.panel(
    'carbon',
    [
      [-0.43, 0.114, -1.133],
      [-0.3, 0.114, -1.173],
      [0, 0.114, -1.19],
      [0.3, 0.114, -1.173],
      [0.43, 0.114, -1.133],
      [0.512, 0.114, -1.08],
      [0.533, 0.114, -0.968],
      [0.488, 0.114, -0.949],
      [-0.488, 0.114, -0.949],
      [-0.533, 0.114, -0.968],
      [-0.512, 0.114, -1.107],
    ],
    0.019,
  )
  b.patch(
    'carbon',
    [
      [0.162, 0.268],
      [0.245, 0.248],
      [0.265, 0.21],
      [0.278, 0.158],
    ].map(([y, width]) =>
      range(-width, width, high ? 16 : 8).map((x) => frontPoint(x, y)),
    ),
  )
  b.tube(
    'accent',
    range(-0.264, 0.264, high ? 12 : 6).map((x) =>
      frontPoint(x, 0.148 + 0.01 * (x / 0.264) ** 2, 0.009),
    ),
    0.007,
  )
  for (const side of [-1, 1]) {
    b.patch(
      'carbon',
      [0, 0.5, 1].map((t) =>
        range(0.302 - 0.008 * t, 0.401 + 0.001 * t, high ? 8 : 4).map((x) =>
          frontPoint(side * x, 0.167 + t * 0.093 + (x - 0.302) * 0.11),
        ),
      ),
      side < 0,
    )
    if (high) {
      for (const y of [0.193, 0.222, 0.247])
        b.tube(
          'metal',
          range(0.31, 0.39, 4).map((x) => frontPoint(side * x, y, 0.01)),
          0.0025,
        )
      b.panel(
        'carbon',
        [
          [side * 0.485, 0.145, -1.076],
          [side * 0.543, 0.164, -1.026],
          [side * 0.514, 0.186, -0.974],
        ],
        0.006,
      )
    }
  }
  if (high) {
    for (const x of [-0.21, -0.14, -0.07, 0, 0.07, 0.14, 0.21])
      b.box(
        'metal',
        [0.004, 0.081, 0.004],
        frontPoint(x, 0.211, 0.01),
        [0, 0, 0],
        0.001,
      )
  }

  b.panel(
    'carbon',
    [
      [-0.428, 0.151, 1.168],
      [-0.398, 0.252, 1.168],
      [0.398, 0.252, 1.168],
      [0.428, 0.151, 1.168],
    ],
    0.01,
  )
  b.panel(
    'carbon',
    [
      [-0.431, 0.12, 1.184],
      [0.431, 0.12, 1.184],
      [0.427, 0.123, 0.992],
      [-0.427, 0.123, 0.992],
    ],
    0.014,
  )
  for (const x of high ? [-0.35, -0.18, 0, 0.18, 0.35] : [-0.33, 0, 0.33]) {
    b.panel(
      'carbon',
      [
        [x, 0.115, 0.982],
        [x, 0.107, 1.185],
        [x, 0.21, 1.185],
        [x, 0.188, 1.074],
      ],
      0.009,
    )
  }
  for (const side of [-1, 1]) {
    b.panel(
      'carbon',
      [
        [side * 0.077, 0.299, 1.168],
        [side * 0.427, 0.317, 1.168],
        [side * 0.426, 0.349, 1.168],
        [side * 0.079, 0.331, 1.168],
      ],
      0.006,
    )
    b.tube(
      'rearLights',
      [
        [side * 0.089, 0.317, 1.175],
        [side * 0.265, 0.327, 1.175],
        [side * 0.414, 0.338, 1.175],
      ],
      0.0075,
    )
    b.tube(
      'metal',
      [
        [side * 0.277, 0.193, 1.142],
        [side * 0.277, 0.193, 1.184],
      ],
      0.023,
    )
    b.ellipsoid('carbon', [0.017, 0.017, 0.002], [side * 0.277, 0.193, 1.187])
  }
  b.box('carbon', [0.138, 0.043, 0.006], [0, 0.275, 1.169], [0, 0, 0], 0.006)
  b.tube(
    'accent',
    [
      [-0.397, 0.265, 1.173],
      [0, 0.258, 1.173],
      [0.397, 0.265, 1.173],
    ],
    0.004,
  )

  // A swept airfoil and shaped swan-neck stays avoid a slab-shaped rear wing.
  const span = range(-0.516, 0.516, high ? 14 : 6)
  const airfoil = [
    [0.892, 0.548],
    [0.916, 0.567],
    [0.98, 0.568],
    [1.066, 0.55],
  ]
  const wingGrid = airfoil.map(([z, y]) =>
    span.map((x) => [
      x,
      y + 0.009 * (Math.abs(x) / 0.516) ** 2,
      z + 0.017 * (Math.abs(x) / 0.516) ** 2,
    ]),
  )
  b.patch('carbon', wingGrid)
  b.patch(
    'carbon',
    wingGrid.map((row) => row.map(([x, y, z]) => [x, y - 0.011, z])),
    true,
  )
  b.patch(
    'carbon',
    [wingGrid[0].map(([x, y, z]) => [x, y - 0.011, z]), wingGrid[0]],
    false,
  )
  b.patch(
    'carbon',
    [wingGrid.at(-1), wingGrid.at(-1).map(([x, y, z]) => [x, y - 0.011, z])],
    false,
  )
  for (const side of [-1, 1]) {
    b.panel(
      'carbon',
      [
        [side * 0.282, 0.42, 0.886],
        [side * 0.282, 0.558, 0.964],
        [side * 0.282, 0.558, 1.008],
        [side * 0.282, 0.409, 0.961],
      ],
      0.017,
    )
    b.panel(
      'accent',
      [
        [side * 0.517, 0.533, 0.901],
        [side * 0.517, 0.595, 0.908],
        [side * 0.517, 0.593, 1.073],
        [side * 0.517, 0.532, 1.089],
      ],
      0.009,
    )
  }

  const plaqueZ = -0.81
  const plaquePosition = topPoint(0, plaqueZ, 0.005)
  const slope =
    (topPoint(0, plaqueZ + 0.01)[1] - topPoint(0, plaqueZ - 0.01)[1]) / 0.02
  const normalLength = Math.hypot(1, slope)
  return b.finish({
    wheels,
    decals: [
      {
        position: plaquePosition,
        normal: [0, 1 / normalLength, -slope / normalLength],
        width: 0.205,
        height: 0.205,
      },
    ],
    anchors: {
      cockpit: [0, 0.533, 0.135],
      frontAxle: [0, 0.205, -0.69],
      rearAxle: [0, 0.205, 0.71],
      roof: [0, 0.689, 0.08],
    },
  })
}
