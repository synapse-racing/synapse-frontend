export type SimulationSpeed = 1 | 2 | 4

interface Props {
  speed: SimulationSpeed
  onChange?: (speed: SimulationSpeed) => void
  disabled?: boolean
}

export function SimulationSpeedControl({ speed, onChange, disabled }: Props) {
  if (!onChange) return <span>Velocidad ×{speed} · Solo anfitrión</span>
  return (
    <button
      disabled={disabled}
      title="Alternar velocidad: ×1, ×2 y ×4"
      aria-label={`Acelerar: velocidad actual ×${speed}`}
      onClick={() => onChange(speed === 1 ? 2 : speed === 2 ? 4 : 1)}
    >
      Acelerar ×{speed}
    </button>
  )
}
