import { createContext, useContext, useEffect, useState } from 'react'

export interface Preferences {
  quality: 'low' | 'high'
  sound: boolean
  reducedMotion: boolean
}
export const defaults: Preferences = {
  quality: 'high',
  sound: false,
  reducedMotion: false,
}
export const PreferencesContext = createContext({
  preferences: defaults,
  update: (_value: Partial<Preferences>) => {},
})
export function useGamePreferences() {
  return useContext(PreferencesContext)
}
export function useReducedMotion() {
  const { preferences } = useGamePreferences()
  const [system, setSystem] = useState(false)
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    const change = () => setSystem(media.matches)
    change()
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return system || preferences.reducedMotion
}
let audioContext: AudioContext | undefined
export function playMenuSound(enabled: boolean) {
  if (!enabled) return
  try {
    audioContext ??= new AudioContext()
    void audioContext.resume().catch(() => {})
    const tone = audioContext.createOscillator(),
      gain = audioContext.createGain()
    tone.connect(gain)
    gain.connect(audioContext.destination)
    tone.frequency.setValueAtTime(520, audioContext.currentTime)
    tone.frequency.exponentialRampToValueAtTime(
      240,
      audioContext.currentTime + 0.08,
    )
    gain.gain.setValueAtTime(0.035, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.1,
    )
    tone.start()
    tone.stop(audioContext.currentTime + 0.1)
  } catch {
    /* Audio must never block navigation. */
  }
}
