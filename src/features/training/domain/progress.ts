export interface TrackProgress {
  expectedCheckpoint: number
  laps: number
  passedCheckpoints: number
}

export const initialTrackProgress: TrackProgress = {
  expectedCheckpoint: 0,
  laps: 0,
  passedCheckpoints: 0,
}

export function advanceTrackProgress(
  progress: TrackProgress,
  crossedCheckpoint: number,
  checkpointCount: number,
): TrackProgress {
  if (checkpointCount < 1) {
    throw new Error('checkpointCount must be positive')
  }
  if (crossedCheckpoint !== progress.expectedCheckpoint) return progress

  const completedLap = crossedCheckpoint === checkpointCount - 1
  return {
    expectedCheckpoint: completedLap ? 0 : crossedCheckpoint + 1,
    laps: progress.laps + (completedLap ? 1 : 0),
    passedCheckpoints: progress.passedCheckpoints + 1,
  }
}
