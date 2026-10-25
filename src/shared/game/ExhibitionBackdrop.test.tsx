import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ExhibitionBackdrop } from './ExhibitionBackdrop.tsx'

vi.mock('../three/SceneCanvas.tsx', () => ({
  SceneCanvas: ({
    frameloop,
    children,
  }: {
    frameloop: string
    children: ReactNode
  }) => (
    <div data-testid="canvas" data-loop={frameloop}>
      {children}
    </div>
  ),
}))
vi.mock('../three/ExhibitionScene.tsx', () => ({
  default: () => <div data-testid="cars" />,
}))

it('keeps rendering cars with reduced camera motion and pauses only when hidden or explicitly paused', async () => {
  const props = {
    theme: 'tournament' as const,
    calm: false,
    paused: false,
    reduced: true,
    audioSpeed: { current: 10 },
  }
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  try {
    const { rerender } = render(<ExhibitionBackdrop {...props} />)
    await screen.findByTestId('cars')
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-loop', 'always')
    hidden.mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    await waitFor(() =>
      expect(screen.getByTestId('canvas')).toHaveAttribute(
        'data-loop',
        'demand',
      ),
    )
    hidden.mockReturnValue(false)
    fireEvent(document, new Event('visibilitychange'))
    await waitFor(() =>
      expect(screen.getByTestId('canvas')).toHaveAttribute(
        'data-loop',
        'always',
      ),
    )
    rerender(<ExhibitionBackdrop {...props} paused />)
    expect(screen.getByTestId('canvas')).toHaveAttribute('data-loop', 'demand')
  } finally {
    hidden.mockRestore()
  }
})
