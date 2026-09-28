import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { SimulationSpeedControl, type SimulationSpeed } from './SimulationSpeedControl.tsx'

it('cycles through normal, double and quadruple speed and back', async () => {
  function Controls() {
    const [speed, setSpeed] = useState<SimulationSpeed>(1)
    return <SimulationSpeedControl speed={speed} onChange={setSpeed} />
  }
  render(<Controls />)
  const user = userEvent.setup()
  for (const speed of [1, 2, 4]) {
    await user.click(screen.getByRole('button', { name: `Acelerar: velocidad actual ×${speed}` }))
  }
  expect(screen.getByRole('button')).toHaveTextContent('Acelerar ×1')
})

it('shows the host speed without an interactive control for guests', () => {
  render(<SimulationSpeedControl speed={4} />)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.getByText('Velocidad ×4 · Solo anfitrión')).toBeInTheDocument()
})
