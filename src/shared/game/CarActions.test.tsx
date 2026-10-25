import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { CarActions } from './CarActions.tsx'

it('offers following to guests and hides elimination without permission', async () => {
  const follow = vi.fn(),
    close = vi.fn()
  render(
    <CarActions
      name="Auto 07"
      status="En pista"
      onFollow={follow}
      onClose={close}
    />,
  )
  expect(
    screen.queryByRole('button', { name: 'Eliminar auto' }),
  ).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /Seguir auto/ }))
  expect(follow).toHaveBeenCalledOnce()
  await userEvent.keyboard('{Escape}')
  expect(close).toHaveBeenCalledOnce()
})

it('disables elimination for an inactive car', () => {
  render(
    <CarActions
      name="Auto 07"
      status="Meta"
      onFollow={vi.fn()}
      onEliminate={vi.fn()}
      canEliminate={false}
      onClose={vi.fn()}
    />,
  )
  expect(screen.getByRole('button', { name: 'Eliminar auto' })).toBeDisabled()
})
