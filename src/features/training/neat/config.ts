export interface NeatConfig {
  simulationVersion: 'race-sim-v1'
  populationSize: number
  inputCount: number
  outputCount: number
  compatibilityThreshold: number
  crossoverRate: number
  weightMutationRate: number
  addConnectionRate: number
  addNodeRate: number
  toggleConnectionRate: number
}

export const defaultNeatConfig: NeatConfig = {
  simulationVersion: 'race-sim-v1',
  populationSize: 24,
  inputCount: 6,
  outputCount: 2,
  compatibilityThreshold: 3,
  crossoverRate: 0.75,
  weightMutationRate: 0.8,
  addConnectionRate: 0.08,
  addNodeRate: 0.04,
  toggleConnectionRate: 0.02,
}
