import { sensorAngles } from '../domain/sensors.ts'

export interface VehicleTelemetry {
  speed: number
  sensors: number[]
}

export const initialTelemetry: VehicleTelemetry = {
  speed: 0,
  sensors: sensorAngles.map(() => 1),
}
