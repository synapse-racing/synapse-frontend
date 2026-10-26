import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { GaragePage } from './GaragePage.tsx'
import {
  AppearanceContext,
  type AppearanceContextValue,
} from '../context/appearance-context.ts'
import { defaultAppearance } from '../domain/appearance.ts'

function mount(overrides: Partial<AppearanceContextValue> = {}) {
  const value: AppearanceContextValue = {
    appearance: defaultAppearance,
    displayAppearance: defaultAppearance,
    guestAppearance: null,
    owner: 'visitor',
    localOnly: true,
    loading: false,
    loadError: false,
    saving: false,
    preview: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
    ...overrides,
  }
  render(
    <AppearanceContext value={value}>
      <MemoryRouter initialEntries={['/garage']}>
        <Routes>
          <Route path="/garage" element={<GaragePage />} />
          <Route path="/dashboard" element={<h1>Paddock</h1>} />
        </Routes>
      </MemoryRouter>
    </AppearanceContext>,
  )
  return value
}

it('previews a model and cancels without saving', async () => {
  const user = userEvent.setup()
  const value = mount()
  await user.click(screen.getByRole('button', { name: /Veloce GT/ }))
  expect(value.preview).toHaveBeenLastCalledWith({
    ...defaultAppearance,
    modelId: 'gt',
  })
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.getByRole('heading', { name: 'Paddock' })).toBeInTheDocument()
  expect(value.preview).toHaveBeenLastCalledWith(null)
  expect(value.save).not.toHaveBeenCalled()
})

it('validates the race number and applies a complete design', async () => {
  const user = userEvent.setup()
  const value = mount()
  await user.click(screen.getByRole('tab', { name: /Identidad/ }))
  const number = screen.getByRole('spinbutton')
  for (const invalid of ['0', '100', '-1', '1.5']) {
    await user.clear(number)
    await user.type(number, invalid)
    expect(
      screen.getByRole('button', { name: /Aplicar cambios/ }),
    ).toBeDisabled()
  }
  await user.clear(number)
  await user.type(number, '23')
  await user.click(screen.getByRole('button', { name: /Aplicar cambios/ }))
  expect(value.save).toHaveBeenCalledExactlyOnceWith({
    ...defaultAppearance,
    number: 23,
  })
  expect(screen.getByRole('status')).toHaveTextContent(
    'guardado en este navegador',
  )
})

it('keeps a failed save editable and retries the same design', async () => {
  const user = userEvent.setup()
  const save = vi
    .fn()
    .mockRejectedValueOnce(new Error('Sin conexión'))
    .mockResolvedValue(undefined)
  mount({ save })
  await user.click(screen.getByRole('button', { name: /Spectre P1/ }))
  await user.click(screen.getByRole('button', { name: /Aplicar cambios/ }))
  expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión')
  expect(screen.getByRole('button', { name: /Spectre P1/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await user.click(screen.getByRole('button', { name: /Aplicar cambios/ }))
  expect(save).toHaveBeenCalledTimes(2)
  expect(save).toHaveBeenLastCalledWith({
    ...defaultAppearance,
    modelId: 'prototype',
  })
})

it('imports a guest design into the preview only until explicitly applied', async () => {
  const user = userEvent.setup()
  const guest = { ...defaultAppearance, number: 42, primaryColor: '#387bef' }
  const value = mount({
    owner: 'account',
    localOnly: false,
    guestAppearance: guest,
  })
  await user.click(
    screen.getByRole('button', { name: 'Usar diseño de invitado' }),
  )
  expect(value.preview).toHaveBeenLastCalledWith(guest)
  expect(value.save).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: /Aplicar cambios/ }))
  expect(value.save).toHaveBeenCalledWith(guest)
})
