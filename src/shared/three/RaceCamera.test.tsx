import { act, render } from '@testing-library/react'
import { useEffect } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { beforeEach, expect, it, vi } from 'vitest'
import { RaceCamera } from './RaceCamera.tsx'

const scene = vi.hoisted(() => ({
  camera: null as PerspectiveCamera | null,
  frame: null as ((_: unknown, delta: number) => void) | null,
  controls: null as {
    target: [number, number, number]
    minDistance: number
  } | null,
}))
vi.mock('@react-three/fiber', () => ({
  useThree: () => ({
    camera: scene.camera,
    size: { width: 1280, height: 720 },
  }),
  useFrame: (callback: typeof scene.frame) => {
    scene.frame = callback
  },
}))
vi.mock('../game/preferences.ts', () => ({ useReducedMotion: () => false }))
vi.mock('@react-three/drei', () => ({
  OrbitControls: (props: NonNullable<typeof scene.controls>) => {
    scene.controls = props
    useEffect(() => {
      scene.camera!.lookAt(...props.target)
    }, [props.target])
    return null
  },
}))

beforeEach(() => {
  scene.camera = new PerspectiveCamera(52, 16 / 9, 0.1, 2000)
  scene.camera.position.set(0, 52, 46)
  scene.controls = null
})

it('releases following without changing the view and leaves camera movement under user control', () => {
  const getTarget = vi.fn(() => ({ x: 50, z: 80, yaw: 1 }))
  const view = render(<RaceCamera mode="follow" getTarget={getTarget} />)
  act(() => scene.frame!(null, 0.1))
  const position = scene.camera!.position.clone()
  const rotation = scene.camera!.quaternion.clone()
  view.rerender(<RaceCamera mode="free" getTarget={getTarget} />)
  expect(scene.controls!.target).toEqual([50, 0.5, 80])
  expect(scene.controls!.minDistance).toBeLessThan(
    position.distanceTo(new Vector3(50, 0.5, 80)),
  )
  expect(scene.camera!.position.equals(position)).toBe(true)
  expect(scene.camera!.quaternion.angleTo(rotation)).toBeLessThan(1e-7)
  const orbitTarget = scene.controls!.target
  const calls = getTarget.mock.calls.length
  scene.camera!.position.add(new Vector3(10, 0, 10))
  const moved = scene.camera!.position.clone()
  act(() => scene.frame!(null, 0.1))
  view.rerender(<RaceCamera mode="free" extent={100} getTarget={getTarget} />)
  expect(scene.controls!.target).toBe(orbitTarget)
  expect(getTarget).toHaveBeenCalledTimes(calls)
  expect(scene.camera!.position.equals(moved)).toBe(true)
})

it('preserves a free view when the generation scene remounts', () => {
  const getTarget = () => ({ x: 50, z: 80, yaw: 1 })
  const view = render(<RaceCamera mode="follow" getTarget={getTarget} />)
  act(() => scene.frame!(null, 0.1))
  const position = scene.camera!.position.clone()
  const direction = scene.camera!.getWorldDirection(new Vector3())
  view.unmount()
  render(<RaceCamera mode="free" getTarget={getTarget} />)
  expect(scene.camera!.position.equals(position)).toBe(true)
  expect(
    scene.camera!.getWorldDirection(new Vector3()).distanceTo(direction),
  ).toBeLessThan(1e-7)
})
