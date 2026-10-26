import { createContext, useContext } from 'react'
import {
  defaultAppearance,
  type VehicleAppearance,
} from '../domain/appearance.ts'

export interface AppearanceContextValue {
  appearance: VehicleAppearance
  displayAppearance: VehicleAppearance
  guestAppearance: VehicleAppearance | null
  owner: string
  localOnly: boolean
  loading: boolean
  loadError: boolean
  saving: boolean
  preview: (value: VehicleAppearance | null) => void
  save: (value: VehicleAppearance) => Promise<void>
  reload: () => void
}

export const AppearanceContext = createContext<AppearanceContextValue>({
  appearance: defaultAppearance,
  displayAppearance: defaultAppearance,
  guestAppearance: null,
  owner: 'visitor',
  localOnly: true,
  loading: false,
  loadError: false,
  saving: false,
  preview: () => {},
  save: async () => {
    throw new Error('El garaje todavía no está listo.')
  },
  reload: () => {},
})

export function useAppearance() {
  return useContext(AppearanceContext)
}
