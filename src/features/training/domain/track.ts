export type Vector3Tuple = [number, number, number]

export interface WallDefinition {
  id: string
  position: Vector3Tuple
  size: Vector3Tuple
}

export interface CheckpointDefinition {
  id: string
  index: number
  position: Vector3Tuple
  size: Vector3Tuple
}

export interface TrackDefinition {
  groundSize: [number, number]
  spawnPosition: Vector3Tuple
  spawnYaw: number
  walls: WallDefinition[]
  checkpoints: CheckpointDefinition[]
}

export const prototypeTrack: TrackDefinition = {
  groundSize: [28, 48],
  spawnPosition: [-10, 0.65, 13],
  spawnYaw: 0,
  walls: [
    { id: 'outer-north', position: [0, 0.7, -24], size: [28, 1.4, 0.6] },
    { id: 'outer-south', position: [0, 0.7, 24], size: [28, 1.4, 0.6] },
    { id: 'outer-west', position: [-14, 0.7, 0], size: [0.6, 1.4, 48] },
    { id: 'outer-east', position: [14, 0.7, 0], size: [0.6, 1.4, 48] },
    { id: 'inner-north', position: [0, 0.7, -16], size: [12, 1.4, 0.6] },
    { id: 'inner-south', position: [0, 0.7, 16], size: [12, 1.4, 0.6] },
    { id: 'inner-west', position: [-6, 0.7, 0], size: [0.6, 1.4, 32] },
    { id: 'inner-east', position: [6, 0.7, 0], size: [0.6, 1.4, 32] },
  ],
  checkpoints: [
    { id: 'sector-west', index: 0, position: [-10, 0.35, 0], size: [7.4, 0.7, 0.35] },
    { id: 'sector-south', index: 1, position: [0, 0.35, -20], size: [0.35, 0.7, 7.4] },
    { id: 'sector-east', index: 2, position: [10, 0.35, 0], size: [7.4, 0.7, 0.35] },
    { id: 'sector-north', index: 3, position: [0, 0.35, 20], size: [0.35, 0.7, 7.4] },
  ],
}
