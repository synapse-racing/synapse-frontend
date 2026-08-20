import type { ConnectionGene, Genome } from './genes.ts'
import type { NeatConfig } from './config.ts'
import { InnovationTracker } from './innovation.ts'
import { SeededRandom } from './random.ts'

export function mutateGenome(
  genome: Genome,
  config: NeatConfig,
  innovations: InnovationTracker,
  random: SeededRandom,
): void {
  if (random.chance(config.weightMutationRate)) mutateWeights(genome, random)
  if (random.chance(config.addConnectionRate)) addConnection(genome, innovations, random)
  if (random.chance(config.addNodeRate)) addNode(genome, innovations, random)
  if (random.chance(config.toggleConnectionRate)) toggleConnection(genome, random)
}

export function mutateWeights(genome: Genome, random: SeededRandom): void {
  for (const connection of genome.connections) {
    connection.weight = random.chance(0.9)
      ? Math.max(-5, Math.min(5, connection.weight + random.range(-0.5, 0.5)))
      : random.range(-1, 1)
  }
}

export function addConnection(
  genome: Genome,
  innovations: InnovationTracker,
  random: SeededRandom,
): boolean {
  const existing = new Set(
    genome.connections.map((connection) => `${connection.source}->${connection.target}`),
  )
  const candidates: [number, number][] = []

  for (const source of genome.nodes) {
    if (source.type === 'output') continue
    for (const target of genome.nodes) {
      if (target.type === 'input' || target.type === 'bias') continue
      if (source.layer >= target.layer) continue
      if (!existing.has(`${source.id}->${target.id}`)) {
        candidates.push([source.id, target.id])
      }
    }
  }

  if (candidates.length === 0) return false
  const [source, target] = random.pick(candidates)
  genome.connections.push({
    innovation: innovations.connection(source, target),
    source,
    target,
    weight: random.range(-1, 1),
    enabled: true,
  })
  return true
}

export function addNode(
  genome: Genome,
  innovations: InnovationTracker,
  random: SeededRandom,
): boolean {
  const candidates = genome.connections.filter((connection) => connection.enabled)
  if (candidates.length === 0) return false

  const connection = random.pick(candidates)
  const nodeId = innovations.nodeForSplit(connection.innovation)
  if (genome.nodes.some((node) => node.id === nodeId)) return false

  const source = genome.nodes.find((node) => node.id === connection.source)
  const target = genome.nodes.find((node) => node.id === connection.target)
  if (!source || !target) return false

  connection.enabled = false
  genome.nodes.push({
    id: nodeId,
    type: 'hidden',
    layer: (source.layer + target.layer) / 2,
  })
  genome.connections.push(
    createConnection(connection.source, nodeId, 1, innovations),
    createConnection(nodeId, connection.target, connection.weight, innovations),
  )
  return true
}

function createConnection(
  source: number,
  target: number,
  weight: number,
  innovations: InnovationTracker,
): ConnectionGene {
  return {
    innovation: innovations.connection(source, target),
    source,
    target,
    weight,
    enabled: true,
  }
}

export function toggleConnection(genome: Genome, random: SeededRandom): void {
  if (genome.connections.length === 0) return
  const connection = random.pick(genome.connections)
  connection.enabled = !connection.enabled
}
