import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TrainingRun } from '../api/training.api.ts'
import { defaultNeatConfig } from '../neat/config.ts'
import { TrainingRunSelector } from './TrainingRunSelector.tsx'

const savedRun: TrainingRun = {
  id: '132f5af1-b50e-43ae-bab7-aee813b6a948',
  name: 'Poblacion guardada',
  status: 'PAUSED',
  seed: 42170,
  currentGeneration: 8,
  bestFitness: 1350,
  config: defaultNeatConfig,
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
  startedAt: null,
  finishedAt: null,
}

describe('TrainingRunSelector', () => {
  it('loads a saved training run', async () => {
    const onLoad = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <TrainingRunSelector
        busy={false}
        error={null}
        onCreate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        onLoad={onLoad}
        runs={[savedRun]}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /^Poblacion guardada/ }),
    )
    expect(onLoad).toHaveBeenCalledWith(savedRun)
    expect(screen.getByText(/Gen. 8/)).toBeInTheDocument()
  })
})
