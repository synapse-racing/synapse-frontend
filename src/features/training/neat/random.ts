export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    this.state += 0x6d2b79f5
    let value = this.state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Cannot pick from an empty array')
    return items[Math.floor(this.next() * items.length)]
  }

  weightedIndex(weights: readonly number[]): number {
    const total = weights.reduce((sum, weight) => sum + Math.max(0, weight), 0)
    if (total === 0) return Math.floor(this.next() * weights.length)

    let cursor = this.next() * total
    for (let index = 0; index < weights.length; index += 1) {
      cursor -= Math.max(0, weights[index])
      if (cursor <= 0) return index
    }
    return weights.length - 1
  }

  exportState(): number {
    return this.state >>> 0
  }

  importState(state: number): void {
    if (!Number.isInteger(state) || state < 0) {
      throw new Error('Invalid random state')
    }
    this.state = state >>> 0
  }
}
