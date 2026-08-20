export interface InnovationSnapshot {
  nextInnovation: number
  nextNode: number
  connections: [string, number][]
  splitNodes: [number, number][]
}

export class InnovationTracker {
  private nextInnovation = 0
  private nextNode: number
  private readonly connections = new Map<string, number>()
  private readonly splitNodes = new Map<number, number>()

  constructor(firstAvailableNodeId: number) {
    this.nextNode = firstAvailableNodeId
  }

  connection(source: number, target: number): number {
    const key = `${source}->${target}`
    const existing = this.connections.get(key)
    if (existing !== undefined) return existing

    const innovation = this.nextInnovation
    this.nextInnovation += 1
    this.connections.set(key, innovation)
    return innovation
  }

  nodeForSplit(connectionInnovation: number): number {
    const existing = this.splitNodes.get(connectionInnovation)
    if (existing !== undefined) return existing

    const nodeId = this.nextNode
    this.nextNode += 1
    this.splitNodes.set(connectionInnovation, nodeId)
    return nodeId
  }

  exportState(): InnovationSnapshot {
    return {
      nextInnovation: this.nextInnovation,
      nextNode: this.nextNode,
      connections: [...this.connections.entries()],
      splitNodes: [...this.splitNodes.entries()],
    }
  }

  importState(snapshot: InnovationSnapshot): void {
    this.nextInnovation = snapshot.nextInnovation
    this.nextNode = snapshot.nextNode
    this.connections.clear()
    this.splitNodes.clear()
    snapshot.connections.forEach(([key, value]) => this.connections.set(key, value))
    snapshot.splitNodes.forEach(([key, value]) => this.splitNodes.set(key, value))
  }
}
