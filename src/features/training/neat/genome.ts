import type { Genome, NodeGene } from './genes.ts'
import { InnovationTracker } from './innovation.ts'
import { SeededRandom } from './random.ts'

export function cloneGenome(genome: Genome, id = genome.id): Genome {
  return {
    id,
    nodes: genome.nodes.map((node) => ({ ...node })),
    connections: genome.connections.map((connection) => ({ ...connection })),
  }
}

export function createInitialGenome(
  id: string,
  inputCount: number,
  outputCount: number,
  innovations: InnovationTracker,
  random: SeededRandom,
): Genome {
  const nodes: NodeGene[] = []
  for (let index = 0; index < inputCount; index += 1) {
    nodes.push({ id: index, type: 'input', layer: 0 })
  }

  const biasId = inputCount
  nodes.push({ id: biasId, type: 'bias', layer: 0 })
  for (let index = 0; index < outputCount; index += 1) {
    nodes.push({ id: biasId + 1 + index, type: 'output', layer: 1 })
  }

  const sources = nodes.filter((node) => node.type === 'input' || node.type === 'bias')
  const outputs = nodes.filter((node) => node.type === 'output')
  return {
    id,
    nodes,
    connections: sources.flatMap((source) =>
      outputs.map((target) => ({
        innovation: innovations.connection(source.id, target.id),
        source: source.id,
        target: target.id,
        weight: random.range(-1, 1),
        enabled: true,
      })),
    ),
  }
}

export function evaluateGenome(genome: Genome, inputs: readonly number[]): number[] {
  const inputNodes = genome.nodes
    .filter((node) => node.type === 'input')
    .sort((left, right) => left.id - right.id)
  if (inputs.length !== inputNodes.length) {
    throw new Error(`Expected ${inputNodes.length} inputs, received ${inputs.length}`)
  }

  const values = new Map<number, number>()
  inputNodes.forEach((node, index) => values.set(node.id, inputs[index]))
  genome.nodes
    .filter((node) => node.type === 'bias')
    .forEach((node) => values.set(node.id, 1))

  const calculatedNodes = genome.nodes
    .filter((node) => node.type === 'hidden' || node.type === 'output')
    .sort((left, right) => left.layer - right.layer || left.id - right.id)

  for (const node of calculatedNodes) {
    const sum = genome.connections
      .filter((connection) => connection.enabled && connection.target === node.id)
      .reduce(
        (total, connection) =>
          total + (values.get(connection.source) ?? 0) * connection.weight,
        0,
      )
    values.set(node.id, Math.tanh(sum))
  }

  return genome.nodes
    .filter((node) => node.type === 'output')
    .sort((left, right) => left.id - right.id)
    .map((node) => values.get(node.id) ?? 0)
}
