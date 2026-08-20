import { compatibilityDistance } from './compatibility.ts'
import type { ScoredGenome, Species } from './genes.ts'

export function speciate(
  genomes: ScoredGenome[],
  threshold: number,
): Species[] {
  const species: Species[] = []

  for (const scored of genomes) {
    const match = species.find(
      (candidate) =>
        compatibilityDistance(scored.genome, candidate.representative) < threshold,
    )
    if (match) {
      match.members.push(scored)
    } else {
      species.push({
        id: species.length,
        representative: scored.genome,
        members: [scored],
      })
    }
  }

  return species
}
