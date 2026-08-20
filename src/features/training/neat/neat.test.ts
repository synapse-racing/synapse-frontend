import { describe, expect, it } from 'vitest'
import { compatibilityDistance } from './compatibility.ts'
import { crossover } from './crossover.ts'
import type { Genome } from './genes.ts'
import {
  cloneGenome,
  createInitialGenome,
  evaluateGenome,
} from './genome.ts'
import { InnovationTracker } from './innovation.ts'
import { addConnection, addNode } from './mutation.ts'
import { NeatPopulation } from './population.ts'
import { SeededRandom } from './random.ts'
import { speciate } from './species.ts'

function initialGenome(seed = 1) {
  return createInitialGenome(
    'test',
    2,
    1,
    new InnovationTracker(4),
    new SeededRandom(seed),
  )
}

describe('NEAT network', () => {
  it('evaluates inputs and bias in feed-forward order', () => {
    const genome = initialGenome()
    genome.connections.forEach((connection) => {
      connection.weight = connection.source === 0 ? 1 : 0
    })

    expect(evaluateGenome(genome, [0.5, 0])[0]).toBeCloseTo(Math.tanh(0.5))
  })

  it('splits a connection into a hidden node with shared innovations', () => {
    const innovations = new InnovationTracker(4)
    const genome = createInitialGenome(
      'test',
      2,
      1,
      innovations,
      new SeededRandom(3),
    )

    expect(addNode(genome, innovations, new SeededRandom(4))).toBe(true)
    expect(genome.nodes.filter((node) => node.type === 'hidden')).toHaveLength(1)
    expect(genome.connections.filter((connection) => connection.enabled)).toHaveLength(4)
    expect(addConnection(genome, innovations, new SeededRandom(5))).toBe(true)
    expect(genome.connections).toHaveLength(6)
  })
})

describe('NEAT reproduction', () => {
  it('keeps fitter disjoint genes during crossover', () => {
    const fitter = initialGenome(2)
    const other = cloneGenome(fitter, 'other')
    fitter.connections.push({
      innovation: 99,
      source: 0,
      target: 3,
      weight: 2,
      enabled: true,
    })

    const child = crossover(
      { genome: fitter, fitness: 10 },
      { genome: other, fitness: 2 },
      'child',
      new SeededRandom(5),
    )
    expect(child.connections.some((gene) => gene.innovation === 99)).toBe(true)
  })

  it('separates structurally distant genomes', () => {
    const first = initialGenome(1)
    const second: Genome = {
      id: 'distant',
      nodes: first.nodes.map((node) => ({ ...node })),
      connections: [],
    }
    expect(compatibilityDistance(first, second)).toBeGreaterThan(1)
    expect(
      speciate(
        [
          { genome: first, fitness: 1 },
          { genome: second, fitness: 1 },
        ],
        1,
      ),
    ).toHaveLength(2)
  })

  it('evolves reproducibly and preserves population size', () => {
    const first = new NeatPopulation(42, { populationSize: 8 })
    const second = new NeatPopulation(42, { populationSize: 8 })
    const firstScores = new Map(
      first.genomes.map((genome, index) => [genome.id, index * 10]),
    )
    const secondScores = new Map(
      second.genomes.map((genome, index) => [genome.id, index * 10]),
    )

    first.evolve(firstScores)
    second.evolve(secondScores)

    expect(first.genomes).toEqual(second.genomes)
    expect(first.genomes).toHaveLength(8)
    expect(first.generation).toBe(1)
  })

  it('restores a snapshot with the exact next evolution', () => {
    const original = new NeatPopulation(77, { populationSize: 6 })
    const firstScores = new Map(
      original.genomes.map((genome, index) => [genome.id, index + 1]),
    )
    original.evolve(firstScores)

    const restored = NeatPopulation.fromSnapshot(
      JSON.parse(JSON.stringify(original.toSnapshot())),
    )
    const nextScores = new Map(
      original.genomes.map((genome, index) => [genome.id, 20 - index]),
    )

    original.evolve(nextScores)
    restored.evolve(nextScores)
    expect(restored.toSnapshot()).toEqual(original.toSnapshot())
  })
})
