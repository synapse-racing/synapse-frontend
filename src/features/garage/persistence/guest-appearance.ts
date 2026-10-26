import {
  parseAppearance,
  type VehicleAppearance,
} from '../domain/appearance.ts'

export const guestAppearanceKey = 'synapse-guest-appearance-v1'

export function readGuestAppearance(): VehicleAppearance | null {
  try {
    return parseAppearance(
      JSON.parse(localStorage.getItem(guestAppearanceKey) ?? 'null'),
    )
  } catch {
    return null
  }
}

export function saveGuestAppearance(value: VehicleAppearance) {
  const appearance = parseAppearance(value)
  if (!appearance) throw new Error('Revisa los colores y el número del auto.')
  try {
    localStorage.setItem(guestAppearanceKey, JSON.stringify(appearance))
  } catch {
    throw new Error(
      'No se pudo guardar en este navegador. Tu diseño sigue abierto para reintentarlo.',
    )
  }
  return appearance
}
