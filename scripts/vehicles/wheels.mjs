import {
  BoxGeometry,
  CylinderGeometry,
  LatheGeometry,
  TorusGeometry,
  Vector2,
} from 'three'
import { createBuilder } from './modeling.mjs'

export function buildWheel({ radius: r, width: w, style }, detail) {
  const b = createBuilder(detail),
    high = detail === 'high',
    segments = high ? 40 : 16
  const rim = r * 0.67
  const profile = [
    [rim, -0.43 * w],
    [r * 0.84, -0.5 * w],
    [r * 0.94, -0.46 * w],
    [r * 0.985, -0.33 * w],
    [r, -0.15 * w],
    [r, 0.15 * w],
    [r * 0.985, 0.33 * w],
    [r * 0.94, 0.46 * w],
    [r * 0.84, 0.5 * w],
    [rim, 0.43 * w],
    [rim, -0.43 * w],
  ]
  b.add(
    'carbon',
    new LatheGeometry(
      profile.map((point) => new Vector2(...point)),
      segments,
    ).rotateZ(Math.PI / 2),
  )
  b.add(
    'rim',
    new CylinderGeometry(rim, rim, w * 0.83, segments, 1, true).rotateZ(
      Math.PI / 2,
    ),
  )
  const spokes = style === 'mesh' ? 10 : style === 'split' ? 6 : 7
  for (const side of [-1, 1]) {
    const x = side * w * 0.44
    b.add(
      'rim',
      new TorusGeometry(rim * 0.96, 0.008, high ? 6 : 4, segments)
        .rotateY(Math.PI / 2)
        .translate(x, 0, 0),
    )
    b.add(
      'rim',
      new CylinderGeometry(r * 0.15, r * 0.15, 0.018, high ? 16 : 8)
        .rotateZ(Math.PI / 2)
        .translate(x, 0, 0),
    )
    for (let i = 0; i < spokes; i++) {
      const angle = (i / spokes) * Math.PI * 2
      const count = style === 'split' ? 2 : 1
      for (let split = 0; split < count; split++) {
        const a = angle + (split - (count - 1) / 2) * 0.12
        const position = [x, Math.cos(a) * rim * 0.51, Math.sin(a) * rim * 0.51]
        b.add(
          'rim',
          new BoxGeometry(0.018, rim * 0.87, style === 'aero' ? 0.034 : 0.015)
            .rotateX(a)
            .translate(...position),
        )
      }
    }
    if (high) {
      b.add(
        'metal',
        new CylinderGeometry(r * 0.52, r * 0.52, 0.008, 24)
          .rotateZ(Math.PI / 2)
          .translate(side * w * 0.26, 0, 0),
      )
    }
  }
  if (high) {
    for (const groove of [-0.22, 0.22]) {
      b.add(
        'carbon',
        new TorusGeometry(r * 1.002, 0.0015, 3, segments)
          .rotateY(Math.PI / 2)
          .translate(w * groove, 0, 0),
      )
    }
  }
  return b.parts
}
