import { useEffect, useRef } from 'react'

export function useExhibitionAudio(enabled: boolean, paused: boolean) {
  const speed = useRef(10)
  const interacted = useRef(false)
  useEffect(() => {
    let context: AudioContext | undefined
    let timer: ReturnType<typeof setInterval> | undefined
    const start = () => {
      interacted.current = true
      if (!enabled || paused || context) return
      try {
        context = new AudioContext()
        const engine = context.createOscillator()
        const overtone = context.createOscillator()
        const filter = context.createBiquadFilter()
        const gain = context.createGain()
        engine.type = 'sawtooth'
        overtone.type = 'triangle'
        filter.type = 'lowpass'
        filter.frequency.value = 380
        gain.gain.value = 0.007
        engine.connect(filter); overtone.connect(filter)
        filter.connect(gain); gain.connect(context.destination)
        engine.start(); overtone.start()
        void context.resume().catch(() => {})
        timer = setInterval(() => {
          if (!context) return
          const rpm = 36 + Math.min(16, speed.current) * 5
          engine.frequency.setTargetAtTime(rpm, context.currentTime, 0.25)
          overtone.frequency.setTargetAtTime(rpm * 2.02, context.currentTime, 0.25)
        }, 150)
      } catch { /* Audio is optional. */ }
    }
    if (interacted.current) start()
    window.addEventListener('pointerdown', start)
    window.addEventListener('keydown', start)
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
      clearInterval(timer)
      void context?.close().catch(() => {})
    }
  }, [enabled, paused])
  return speed
}
