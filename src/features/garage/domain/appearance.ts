export interface VehicleAppearance {
  modelId: 'formula' | 'gt' | 'prototype'
  primaryColor: string
  secondaryColor: string
  rimColor: string
  finish: 'matte' | 'satin' | 'metallic'
  livery: 'solid' | 'stripe' | 'split'
  number: number
}

export const defaultAppearance: VehicleAppearance = {
  modelId: 'formula',
  primaryColor: '#ff692f',
  secondaryColor: '#f4ead3',
  rimColor: '#d7dce0',
  finish: 'satin',
  livery: 'solid',
  number: 7,
}

export const vehicleCatalog: ReadonlyArray<{
  id: VehicleAppearance['modelId']
  name: string
  category: string
  description: string
}> = [
  {
    id: 'formula',
    name: 'Apex F1',
    category: 'Monoplaza',
    description: 'Cabina abierta. Ruedas expuestas. ADN de circuito.',
  },
  {
    id: 'gt',
    name: 'Veloce GT',
    category: 'Gran turismo',
    description: 'Carrocería ancha y una silueta de competición clásica.',
  },
  {
    id: 'prototype',
    name: 'Spectre P1',
    category: 'Prototipo',
    description: 'Perfil bajo, cabina cerrada y líneas de resistencia.',
  },
]

export function parseAppearance(value: unknown): VehicleAppearance | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  const color = (input: unknown): input is string =>
    typeof input === 'string' && /^#[0-9a-f]{6}$/i.test(input)
  if (
    !['formula', 'gt', 'prototype'].includes(data.modelId as string) ||
    !['matte', 'satin', 'metallic'].includes(data.finish as string) ||
    !['solid', 'stripe', 'split'].includes(data.livery as string) ||
    !color(data.primaryColor) ||
    !color(data.secondaryColor) ||
    !color(data.rimColor) ||
    typeof data.number !== 'number' ||
    !Number.isInteger(data.number) ||
    data.number < 1 ||
    data.number > 99
  )
    return null
  return {
    modelId: data.modelId as VehicleAppearance['modelId'],
    primaryColor: data.primaryColor.toLowerCase(),
    secondaryColor: data.secondaryColor.toLowerCase(),
    rimColor: data.rimColor.toLowerCase(),
    finish: data.finish as VehicleAppearance['finish'],
    livery: data.livery as VehicleAppearance['livery'],
    number: data.number,
  }
}
