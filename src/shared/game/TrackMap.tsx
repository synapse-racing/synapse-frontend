import { useMemo } from 'react'
import { generateTrack } from '../../features/training/domain/track.ts'
import type { TrackRecipe } from '../../features/training/domain/track.ts'
export function TrackMap({ recipe }: { recipe: TrackRecipe }) {
  const track = useMemo(() => generateTrack(recipe), [recipe.version, recipe.seed])
  const [width, height] = track.groundSize
  return <svg className="track-map" viewBox={`${-width / 2 - 3} ${-height / 2 - 3} ${width + 6} ${height + 6}`} role="img" aria-label={`Trazado del circuito ${recipe.seed}`}>
    {track.boundaries.map(([x1, z1, x2, z2], index) => <line key={index} x1={x1} y1={z1} x2={x2} y2={z2} stroke="#c9d2bc" strokeWidth={0.45} />)}
    <circle cx={track.spawnPosition[0]} cy={track.spawnPosition[2]} r={1.4} fill="#ff713c" />
  </svg>
}
