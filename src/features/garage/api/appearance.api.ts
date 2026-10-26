import { apiRequest } from '../../../shared/api/http.ts'
import type { VehicleAppearance } from '../domain/appearance.ts'

export interface AppearanceResponse {
  appearance: VehicleAppearance
  customized: boolean
}

export function getAppearance(token: string) {
  return apiRequest<AppearanceResponse>('/users/me/appearance', { token })
}

export function saveAppearance(token: string, appearance: VehicleAppearance) {
  return apiRequest<AppearanceResponse>('/users/me/appearance', {
    token,
    method: 'PATCH',
    body: JSON.stringify(appearance),
  })
}
