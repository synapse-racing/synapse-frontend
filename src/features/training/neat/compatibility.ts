import type { Genome } from './genes.ts'

export function compatibilityDistance(first: Genome, second: Genome): number {
  const firstGenes = new Map(
    first.connections.map((connection) => [connection.innovation, connection]),
  )
  const secondGenes = new Map(
    second.connections.map((connection) => [connection.innovation, connection]),
  )
  const firstMax = Math.max(-1, ...firstGenes.keys())
  const secondMax = Math.max(-1, ...secondGenes.keys())
  const innovations = new Set([...firstGenes.keys(), ...secondGenes.keys()])
  let matching = 0
  let weightDifference = 0
  let disjoint = 0
  let excess = 0

  for (const innovation of innovations) {
    const firstGene = firstGenes.get(innovation)
    const secondGene = secondGenes.get(innovation)
    if (firstGene && secondGene) {
      matching += 1
      weightDifference += Math.abs(firstGene.weight - secondGene.weight)
    } else if (
      (firstGene && innovation > secondMax) ||
      (secondGene && innovation > firstMax)
    ) {
      excess += 1
    } else {
      disjoint += 1
    }
  }

  const normalizer = Math.max(first.connections.length, second.connections.length) < 20
    ? 1
    : Math.max(first.connections.length, second.connections.length)
  const averageWeightDifference = matching === 0 ? 0 : weightDifference / matching
  return (excess + disjoint) / normalizer + 0.4 * averageWeightDifference
}
