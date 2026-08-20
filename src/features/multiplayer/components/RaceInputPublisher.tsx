import { useKeyboardControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import {
  type VehicleControlName,
} from '../../training/domain/controls.ts'
import type { RaceInput } from '../types/multiplayer.ts'

interface RaceInputPublisherProps {
  enabled: boolean
  onInput: (input: RaceInput) => void
}

export function RaceInputPublisher({ enabled, onInput }: RaceInputPublisherProps) {
  const [, getControls] = useKeyboardControls<VehicleControlName>()
  const elapsed = useRef(0)
  const sequence = useRef(0)

  useFrame((_, delta) => {
    if (!enabled) return
    elapsed.current += delta
    if (elapsed.current < 0.05) return
    elapsed.current = 0

    const controls = getControls()
    onInput({
      sequence: sequence.current,
      steering: Number(controls.left) - Number(controls.right),
      throttle: Number(controls.forward) - Number(controls.reverse),
    })
    sequence.current += 1
  })

  return null
}
