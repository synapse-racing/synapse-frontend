export const vehicleControlNames = {
  forward: 'forward',
  reverse: 'reverse',
  left: 'left',
  right: 'right',
  reset: 'reset',
} as const

export type VehicleControlName =
  (typeof vehicleControlNames)[keyof typeof vehicleControlNames]
