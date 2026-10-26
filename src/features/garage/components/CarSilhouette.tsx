import type { VehicleAppearance } from '../domain/appearance.ts'

export function CarSilhouette({
  modelId,
  color = 'currentColor',
}: {
  modelId: VehicleAppearance['modelId']
  color?: string
}) {
  return (
    <svg viewBox="0 0 160 68" aria-hidden="true" className="car-silhouette">
      <path d="M8 53h144" stroke="currentColor" opacity=".18" />
      <circle
        cx="37"
        cy="46"
        r="11"
        fill="#131a1c"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="127"
        cy="46"
        r="11"
        fill="#131a1c"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        fill={color}
        d={
          modelId === 'formula'
            ? 'M10 39h47l9-11h19l14 8 39-2 10 8-9 6H52l-9-7H10z'
            : modelId === 'gt'
              ? 'M14 35l31-5 20-16h37l20 19 22 4 5 10h-9l-8-13-12 1-7 12H53L43 33H31l-8 14H12z'
              : 'M10 33l43-4 15-13h25l22 15 30 1 6 15h-12l-8-13h-12l-8 13H52l-8-13H31l-8 13H9z'
        }
      />
      <path
        d={modelId === 'formula' ? 'M72 28v-9h9l6 9' : 'M67 18h26l15 13H54z'}
        fill="#152b34"
      />
      <path
        d={
          modelId === 'formula'
            ? 'M130 23h22v5h-22zM141 28v9'
            : 'M132 24h20v4h-20zM142 28v8'
        }
        stroke={color}
        fill={color}
      />
      <path d="M57 42h48" stroke="#fff" strokeWidth="2" opacity=".7" />
    </svg>
  )
}
