/**
 * Collision volumes of the garage interior, used to keep the orbit camera
 * from going through walls, the back sign or the furniture. Boxes are
 * axis-aligned and expressed in world units as [min, max] corners.
 */
export type Box = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
]

export const garageColliders: readonly Box[] = [
  // Side walls (including the inner pillars).
  [
    [-11.2, 0, -11],
    [-10.25, 8.2, 11],
  ],
  [
    [10.25, 0, -11],
    [11.2, 8.2, 11],
  ],
  // Back wall with the bay sign.
  [
    [-11.2, 0, 7.8],
    [11.2, 8.2, 8.5],
  ],
  // Roof trusses and lamps.
  [
    [-11.2, 7.3, -11],
    [11.2, 40, 8.5],
  ],
  // Tool cabinets.
  [
    [5.5, 0, 6],
    [8.95, 2.55, 6.85],
  ],
  // Workbench.
  [
    [5.5, 0, 2.85],
    [7.95, 1.9, 3.95],
  ],
  // Tyre stack.
  [
    [-8.2, 0, 5.1],
    [-6.8, 1.9, 6.5],
  ],
]

export const cameraLimits = {
  minDistance: 4.5,
  maxDistance: 23,
  /** Space kept between the camera and any surface it hits. */
  margin: 0.45,
  /** Closest the camera may get when squeezed against a wall. */
  hardMinDistance: 1.6,
}

/**
 * Distance along a ray from `origin` (normalised `direction`) to the first
 * collider it enters, or `Infinity` when nothing is hit.
 */
export function firstHitDistance(
  origin: readonly [number, number, number],
  direction: readonly [number, number, number],
  colliders: readonly Box[] = garageColliders,
) {
  let nearest = Infinity
  for (const [min, max] of colliders) {
    let enter = -Infinity
    let exit = Infinity
    let inside = true
    for (let axis = 0; axis < 3; axis++) {
      const o = origin[axis]
      const d = direction[axis]
      if (o < min[axis] || o > max[axis]) inside = false
      if (Math.abs(d) < 1e-9) {
        if (o < min[axis] || o > max[axis]) {
          enter = Infinity
          break
        }
        continue
      }
      const t1 = (min[axis] - o) / d
      const t2 = (max[axis] - o) / d
      enter = Math.max(enter, Math.min(t1, t2))
      exit = Math.min(exit, Math.max(t1, t2))
    }
    if (inside || enter > exit || exit < 0) continue
    if (enter >= 0 && enter < nearest) nearest = enter
  }
  return nearest
}

/**
 * Largest distance the camera may sit from `target` in `direction` without
 * crossing a collider, capped at `desired`.
 */
export function allowedCameraDistance(
  target: readonly [number, number, number],
  direction: readonly [number, number, number],
  desired: number,
  colliders: readonly Box[] = garageColliders,
) {
  const hit = firstHitDistance(target, direction, colliders)
  const free = hit - cameraLimits.margin
  return Math.max(cameraLimits.hardMinDistance, Math.min(desired, free))
}
