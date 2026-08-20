import type { Genome, ScoredGenome } from './genes.ts'
import { SeededRandom } from './random.ts'

export function crossover(
  first: ScoredGenome,
  second: ScoredGenome,
  childId: string,
  random: SeededRandom,
): Genome {
  const fitter =
    first.fitness > second.fitness
      ? first
      : second.fitness > first.fitness
        ? second
        : random.chance(0.5)
          ? first
          : second
  const other = fitter === first ? second : first
  const otherGenes = new Map(
    other.genome.connections.map((connection) => [connection.innovation, connection]),
  )

  const connections = fitter.genome.connections.map((fitterGene) => {
    const matching = otherGenes.get(fitterGene.innovation)
    const selected = matching && random.chance(0.5) ? matching : fitterGene
    const enabled = matching && (!matching.enabled || !fitterGene.enabled)
      ? random.chance(0.25)
      : selected.enabled
    return { ...selected, enabled }
  })

  const requiredNodes = new Set(
    connections.flatMap((connection) => [connection.source, connection.target]),
  )
  const nodes = fitter.genome.nodes
    .filter(
      (node) =>
        requiredNodes.has(node.id) ||
        node.type === 'input' ||
        node.type === 'bias' ||
        node.type === 'output',
    )
    .map((node) => ({ ...node }))

  return { id: childId, nodes, connections }
}
