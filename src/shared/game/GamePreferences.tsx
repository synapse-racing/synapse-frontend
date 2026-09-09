import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { defaults, PreferencesContext } from './preferences.ts'
import type { Preferences } from './preferences.ts'

export function GamePreferences({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('synapse-preferences') ?? '{}',
      )
      return {
        quality: saved.quality === 'low' ? 'low' : 'high',
        sound: saved.sound === true,
        reducedMotion: saved.reducedMotion === true,
      }
    } catch {
      return defaults
    }
  })
  const update = (value: Partial<Preferences>) =>
    setPreferences((current) => ({ ...current, ...value }))
  useEffect(() => {
    try {
      localStorage.setItem('synapse-preferences', JSON.stringify(preferences))
    } catch {
      /* Storage is optional. */
    }
  }, [preferences])
  return (
    <PreferencesContext value={{ preferences, update }}>
      {children}
    </PreferencesContext>
  )
}
