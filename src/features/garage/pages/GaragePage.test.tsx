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

it('returns to the paddock directly when there are no changes', async () => {
  const user = userEvent.setup()
  const value = mount()
  await user.click(screen.getByRole('button', { name: /Volver al Paddock/ }))
  expect(screen.getByRole('heading', { name: 'Paddock' })).toBeInTheDocument()
  expect(value.save).not.toHaveBeenCalled()
})

it('previews a model and discards it without saving', async () => {
  const user = userEvent.setup()
  const value = mount()
  await user.click(screen.getByRole('button', { name: /Veloce GT/ }))
  expect(value.preview).toHaveBeenLastCalledWith({
    ...defaultAppearance,
    modelId: 'gt',
  })
  await user.click(screen.getByRole('button', { name: 'Descartar' }))
  expect(value.preview).toHaveBeenLastCalledWith(defaultAppearance)
  expect(screen.getByRole('button', { name: /Apex F1/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(value.save).not.toHaveBeenCalled()
})

it('validates the race number and applies a complete design', async () => {
  const user = userEvent.setup()
  const value = mount()
  await user.click(screen.getByRole('tab', { name: /Número/ }))
  const number = screen.getByRole('spinbutton')
  for (const invalid of ['0', '100', '-1', '1.5']) {
    await user.clear(number)
    await user.type(number, invalid)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  }
  await user.clear(number)
  await user.type(number, '23')
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(value.save).toHaveBeenCalledExactlyOnceWith({
    ...defaultAppearance,
    number: 23,
  })
  expect(screen.getByRole('status')).toHaveTextContent(
    'guardado en este navegador',
  )
})

it('saves and returns to the paddock in a single step', async () => {
  const user = userEvent.setup()
  const value = mount()
  await user.click(screen.getByRole('tab', { name: /Acabado/ }))
  await user.click(screen.getByRole('button', { name: 'Metálico' }))
  await user.click(screen.getByRole('button', { name: 'Guardar y volver' }))
  expect(value.save).toHaveBeenCalledExactlyOnceWith({
    ...defaultAppearance,
    finish: 'metallic',
  })
  expect(screen.getByRole('heading', { name: 'Paddock' })).toBeInTheDocument()
})

it('stays in the garage when saving and returning fails', async () => {
  const user = userEvent.setup()
  mount({ save: vi.fn().mockRejectedValue(new Error('Sin conexión')) })
  await user.click(screen.getByRole('button', { name: /Spectre P1/ }))
  await user.click(screen.getByRole('button', { name: 'Guardar y volver' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión')
  expect(
    screen.queryByRole('heading', { name: 'Paddock' }),
  ).not.toBeInTheDocument()
})

it('keeps a failed save editable and retries the same design', async () => {
  const user = userEvent.setup()
  const save = vi
    .fn()
    .mockRejectedValueOnce(new Error('Sin conexión'))
    .mockResolvedValue(undefined)
  mount({ save })
  await user.click(screen.getByRole('button', { name: /Spectre P1/ }))
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión')
  expect(screen.getByRole('button', { name: /Spectre P1/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(save).toHaveBeenCalledTimes(2)
  expect(save).toHaveBeenLastCalledWith({
    ...defaultAppearance,
    modelId: 'prototype',
  })
})

it('asks before leaving with unsaved changes and can save on the way out', async () => {
  const user = userEvent.setup()
  const value = mount()
  await user.click(screen.getByRole('button', { name: /Veloce GT/ }))
  await user.click(screen.getByRole('link', { name: /Paddock/ }))
  const dialog = screen.getByRole('dialog', { name: 'Cambios sin guardar' })
  expect(dialog).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Guardar y salir' }))
  expect(value.save).toHaveBeenCalledExactlyOnceWith({
    ...defaultAppearance,
    modelId: 'gt',
  })
  expect(screen.getByRole('heading', { name: 'Paddock' })).toBeInTheDocument()
})

it('discards changes from the leave dialog', async () => {
  const user = userEvent.setup()
  const value = mount()
  await user.click(screen.getByRole('button', { name: /Veloce GT/ }))
  await user.click(screen.getByRole('link', { name: /Paddock/ }))
  await user.click(screen.getByRole('button', { name: 'Descartar y salir' }))
  expect(screen.getByRole('heading', { name: 'Paddock' })).toBeInTheDocument()
  expect(value.preview).toHaveBeenLastCalledWith(null)
  expect(value.save).not.toHaveBeenCalled()
})

it('saves with Ctrl+S', async () => {
  const user = userEvent.setup()
  const value = mount()
  await user.click(screen.getByRole('button', { name: /Spectre P1/ }))
  await user.keyboard('{Control>}s{/Control}')
  expect(value.save).toHaveBeenCalledExactlyOnceWith({
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
  await user.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(value.save).toHaveBeenCalledWith(guest)
})
