import { describe, expect, it } from 'vitest'
import {
  defaultAppearance,
  parseAppearance,
  vehicleCatalog,
} from './appearance.ts'

describe('vehicle appearance', () => {
  it('accepts every catalog model and normalizes colors without carrying unknown fields', () => {
    for (const model of vehicleCatalog) {
      expect(
        parseAppearance({
          ...defaultAppearance,
          modelId: model.id,
          primaryColor: '#AABBCC',
          extra: true,
        }),
      ).toEqual({
        ...defaultAppearance,
        modelId: model.id,
        primaryColor: '#aabbcc',
      })
    }
  })

  it.each([
    null,
    [],
    {},
    { ...defaultAppearance, modelId: '/custom.glb' },
    { ...defaultAppearance, primaryColor: 'red' },
    { ...defaultAppearance, rimColor: '#abc' },
    { ...defaultAppearance, secondaryColor: null },
    { ...defaultAppearance, number: 0 },
    { ...defaultAppearance, number: 100 },
    { ...defaultAppearance, number: 1.5 },
    { ...defaultAppearance, number: '7' },
    { ...defaultAppearance, finish: 'chrome' },
    { ...defaultAppearance, livery: 'external' },
  ])('rejects invalid stored or remote data: %j', (input) => {
    expect(parseAppearance(input)).toBeNull()
  })
})
