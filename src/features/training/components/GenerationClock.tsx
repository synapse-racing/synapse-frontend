import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

interface GenerationClockProps {
  generationKey: string
  maxSeconds: number
  onTimeout: () => void
  running: boolean
}

export function GenerationClock({
  generationKey,
  maxSeconds,
  onTimeout,
  running,
}: GenerationClockProps) {
  const elapsed = useRef(0)
  const observedKey = useRef(generationKey)
  const triggered = useRef(false)

  useFrame((_, delta) => {
    if (observedKey.current !== generationKey) {
      observedKey.current = generationKey
      elapsed.current = 0
      triggered.current = false
    }
    if (!running || triggered.current) return

    elapsed.current += Math.min(delta, 0.05)
    if (elapsed.current >= maxSeconds) {
      triggered.current = true
      onTimeout()
    }
  })

  return null
}
