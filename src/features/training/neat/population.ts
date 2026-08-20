import { defaultNeatConfig, type NeatConfig } from './config.ts'
import { crossover } from './crossover.ts'
import type { Genome, ScoredGenome, Species } from './genes.ts'
import { cloneGenome, createInitialGenome } from './genome.ts'
import {
  InnovationTracker,
  type InnovationSnapshot,
} from './innovation.ts'
import { mutateGenome } from './mutation.ts'
import { SeededRandom } from './random.ts'
import { speciate } from './species.ts'

export interface GenerationMetrics {
  generation: number
  bestFitness: number
  averageFitness: number
  speciesCount: number
}

export interface NeatPopulationSnapshot {
  version: 1
  seed: number
  config: NeatConfig
  generation: number
  nextGenomeId: number
  randomState: number
  innovations: InnovationSnapshot
  genomes: Genome[]
}

export class NeatPopulation {
  readonly config: NeatConfig
  readonly seed: number
  generation = 0
  genomes: Genome[]

  private readonly random: SeededRandom
  private readonly innovations: InnovationTracker
  private nextGenomeId = 0

  constructor(seed: number, config: Partial<NeatConfig> = {}) {
    this.seed = seed
    this.config = { ...defaultNeatConfig, ...config }
    this.random = new SeededRandom(seed)
    this.innovations = new InnovationTracker(
      this.config.inputCount + 1 + this.config.outputCount,
    )
    this.genomes = Array.from({ length: this.config.populationSize }, () =>
      createInitialGenome(
        this.createId(),
        this.config.inputCount,
        this.config.outputCount,
        this.innovations,
        this.random,
      ),
    )
  }

  static fromSnapshot(snapshot: NeatPopulationSnapshot): NeatPopulation {
    if (snapshot.version !== 1) {
      throw new Error(`Unsupported NEAT snapshot version: ${String(snapshot.version)}`)
    }
    if (snapshot.genomes.length !== snapshot.config.populationSize) {
      throw new Error('Snapshot population size does not match its configuration')
    }

    const population = new NeatPopulation(snapshot.seed, snapshot.config)
    population.generation = snapshot.generation
    population.nextGenomeId = snapshot.nextGenomeId
    population.random.importState(snapshot.randomState)
    population.innovations.importState(snapshot.innovations)
    population.genomes = snapshot.genomes.map((genome) => cloneGenome(genome))
    return population
  }

  evolve(fitnessByGenome: ReadonlyMap<string, number>): GenerationMetrics {
    const scored = this.genomes
      .map((genome) => ({
        genome,
        fitness: Math.max(0, fitnessByGenome.get(genome.id) ?? 0),
      }))
      .sort((left, right) => right.fitness - left.fitness)
    const grouped = speciate(scored, this.config.compatibilityThreshold)
    const metrics = this.metrics(scored, grouped)
    const nextGeneration: Genome[] = [
      cloneGenome(scored[0].genome, this.createId()),
    ]

    while (nextGeneration.length < this.config.populationSize) {
      const selectedSpecies = this.selectSpecies(grouped)
      const first = this.selectParent(selectedSpecies)
      let child: Genome

      if (
        selectedSpecies.members.length > 1 &&
        this.random.chance(this.config.crossoverRate)
      ) {
        const second = this.selectParent(selectedSpecies)
        child = crossover(first, second, this.createId(), this.random)
      } else {
        child = cloneGenome(first.genome, this.createId())
      }

      mutateGenome(child, this.config, this.innovations, this.random)
      nextGeneration.push(child)
    }

    this.genomes = nextGeneration
    this.generation += 1
    return metrics
  }

  currentSpecies(): Species[] {
    return speciate(
      this.genomes.map((genome) => ({ genome, fitness: 0 })),
      this.config.compatibilityThreshold,
    )
  }

  toSnapshot(): NeatPopulationSnapshot {
    return {
      version: 1,
      seed: this.seed,
      config: { ...this.config },
      generation: this.generation,
      nextGenomeId: this.nextGenomeId,
      randomState: this.random.exportState(),
      innovations: this.innovations.exportState(),
      genomes: this.genomes.map((genome) => cloneGenome(genome)),
    }
  }

  private createId(): string {
    const id = `genome-${this.nextGenomeId}`
    this.nextGenomeId += 1
    return id
  }

  private selectSpecies(species: Species[]): Species {
    const weights = species.map((candidate) =>
      candidate.members.reduce(
        (sum, member) => sum + member.fitness / candidate.members.length,
        0,
      ),
    )
    return species[this.random.weightedIndex(weights)]
  }

  private selectParent(species: Species): ScoredGenome {
    const weights = species.members.map((member) => member.fitness + 0.001)
    return species.members[this.random.weightedIndex(weights)]
  }

  private metrics(scored: ScoredGenome[], species: Species[]): GenerationMetrics {
    return {
      generation: this.generation,
      bestFitness: scored[0]?.fitness ?? 0,
      averageFitness:
        scored.reduce((sum, member) => sum + member.fitness, 0) /
        Math.max(1, scored.length),
      speciesCount: species.length,
    }
  }
}
