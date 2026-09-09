import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { NeatTrainingHud } from './NeatTrainingHud.tsx'

describe('NeatTrainingHud', () => {
  it('regenerates the track from an active training session', async () => {
    const onRegenerateTrack = vi.fn()
    const onPauseToggle = vi.fn()
    const onCameraModeChange = vi.fn()
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
          onPauseToggle={onPauseToggle}
          onCameraModeChange={onCameraModeChange}
          onRegenerateTrack={onRegenerateTrack}
          onReset={vi.fn()}
          onSelectRun={vi.fn()}
          onStart={vi.fn()}
          persistenceStatus="saved"
          populationSize={24}
          status="paused"
          trainingName="Curvas"
        />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Regenerar pista' }))
    expect(onRegenerateTrack).toHaveBeenCalledOnce()
    await user.keyboard('{Escape}')
    expect(onPauseToggle).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: 'Seguir auto' }))
    expect(onCameraModeChange).toHaveBeenCalledWith('follow')
    await user.click(screen.getByRole('button', { name: 'Telemetría' }))
    expect(
      screen.getByRole('region', { name: 'Telemetría NEAT' }),
    ).toHaveTextContent('Promedio')
  })
})
