import type { RapierRigidBody } from '@react-three/rapier'
import { Quaternion, Vector3 } from 'three'

export const vehicleMaxSpeed = 13

export interface VehicleMotionWorkspace {
  orientation: Quaternion
  forward: Vector3
  right: Vector3
  velocity: Vector3
}

export function createVehicleMotionWorkspace(): VehicleMotionWorkspace {
  return {
    orientation: new Quaternion(),
    forward: new Vector3(),
    right: new Vector3(),
    velocity: new Vector3(),
  }
}

export function applyVehicleControl(
  body: RapierRigidBody,
  throttle: number,
  steering: number,
  frameDelta: number,
  workspace: VehicleMotionWorkspace,
): number {
  const delta = Math.min(frameDelta, 0.05)
  const rotation = body.rotation()
  workspace.orientation.set(rotation.x, rotation.y, rotation.z, rotation.w)
  workspace.forward.set(0, 0, -1).applyQuaternion(workspace.orientation)
  workspace.forward.y = 0
  workspace.forward.normalize()
  workspace.right.set(1, 0, 0).applyQuaternion(workspace.orientation)
  workspace.right.y = 0
  workspace.right.normalize()

  const linearVelocity = body.linvel()
  workspace.velocity.set(linearVelocity.x, linearVelocity.y, linearVelocity.z)
  const planarSpeed = Math.hypot(linearVelocity.x, linearVelocity.z)
  const forwardSpeed = workspace.velocity.dot(workspace.forward)

  if (throttle !== 0) {
    body.applyImpulse(
      {
        x: workspace.forward.x * throttle * 18 * delta,
        y: 0,
        z: workspace.forward.z * throttle * 18 * delta,
      },
      true,
    )
  }

  if (steering !== 0 && planarSpeed > 0.25) {
    const reverseDirection = forwardSpeed < -0.1 ? -1 : 1
    body.applyTorqueImpulse(
      { x: 0, y: steering * reverseDirection * 3.8 * delta, z: 0 },
      true,
    )
  }

  const lateralSpeed = workspace.velocity.dot(workspace.right)
  body.applyImpulse(
    {
      x: -workspace.right.x * lateralSpeed * 0.08,
      y: 0,
      z: -workspace.right.z * lateralSpeed * 0.08,
    },
    true,
  )

  if (planarSpeed > vehicleMaxSpeed) {
    const ratio = vehicleMaxSpeed / planarSpeed
    body.setLinvel(
      {
        x: linearVelocity.x * ratio,
        y: linearVelocity.y,
        z: linearVelocity.z * ratio,
      },
      true,
    )
  }

  return planarSpeed
}
