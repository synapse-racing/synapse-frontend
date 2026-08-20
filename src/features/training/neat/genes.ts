export type NodeType = 'input' | 'bias' | 'hidden' | 'output'

export interface NodeGene {
  id: number
  type: NodeType
  layer: number
}

export interface ConnectionGene {
  innovation: number
  source: number
  target: number
  weight: number
  enabled: boolean
}

export interface Genome {
  id: string
  nodes: NodeGene[]
  connections: ConnectionGene[]
}

export interface ScoredGenome {
  genome: Genome
  fitness: number
}

export interface Species {
  id: number
  representative: Genome
  members: ScoredGenome[]
}
