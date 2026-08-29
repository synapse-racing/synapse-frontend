import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { NeatTrainingHud } from './NeatTrainingHud.tsx'

describe('NeatTrainingHud', () => {
  it('regenerates the track from an active training session', async () => {
    const onRegenerateTrack = vi.fn()
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <NeatTrainingHud
          alive={24}
          currentBest={0}
          generation={2}
          metrics={{
            generation: 1,
            bestFitness: 10,
            averageFitness: 5,
            speciesCount: 2,
          }}
          onPauseToggle={vi.fn()}
          onRegenerateTrack={onRegenerateTrack}
          onReset={vi.fn()}
          onSelectRun={vi.fn()}
          onStart={vi.fn()}
          persistenceStatus="saved"
          populationSize={24}
          seed={42_170}
          status="paused"
          trackSeed={123}
          trainingName="Curvas"
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Regenerar pista' }))
    expect(onRegenerateTrack).toHaveBeenCalledOnce()
    expect(screen.getByText(/pista 123/)).toBeInTheDocument()
  })
})
