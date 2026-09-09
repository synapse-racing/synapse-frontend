import { createContext, useContext, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'

interface Preferences { quality: 'low' | 'high'; sound: boolean; reducedMotion: boolean }
const defaults: Preferences = { quality: 'high', sound: false, reducedMotion: false }
const PreferencesContext = createContext({ preferences: defaults, update: (_value: Partial<Preferences>) => {} })
export function GamePreferences({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('synapse-preferences') ?? '{}')
      return { quality: saved.quality === 'low' ? 'low' : 'high', sound: saved.sound === true, reducedMotion: saved.reducedMotion === true }
    } catch { return defaults }
  })
  const update = (value: Partial<Preferences>) => setPreferences(current => ({ ...current, ...value }))
  useEffect(() => { try { localStorage.setItem('synapse-preferences', JSON.stringify(preferences)) } catch { /* Storage is optional. */ } }, [preferences])
  return <PreferencesContext value={{ preferences, update }}>{children}</PreferencesContext>
}
export function useGamePreferences() { return useContext(PreferencesContext) }
export function useReducedMotion() {
  const { preferences } = useGamePreferences()
  const [system, setSystem] = useState(false)
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    const change = () => setSystem(media.matches)
    change(); media.addEventListener('change', change)
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
    const tone = audioContext.createOscillator(), gain = audioContext.createGain()
    tone.connect(gain); gain.connect(audioContext.destination)
    tone.frequency.setValueAtTime(520, audioContext.currentTime)
    tone.frequency.exponentialRampToValueAtTime(240, audioContext.currentTime + 0.08)
    gain.gain.setValueAtTime(0.035, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1)
    tone.start(); tone.stop(audioContext.currentTime + 0.1)
  } catch { /* Audio must never block navigation. */ }
}
