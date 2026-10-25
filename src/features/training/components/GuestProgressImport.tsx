import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/context/useAuth.ts'
import { listGuestTrainings } from '../persistence/guest-training.ts'
import {
  guestImportIntentKey,
  importGuestTrainings,
} from '../persistence/import-guest-training.ts'
import { ApiError } from '../../../shared/api/http.ts'

export function GuestProgressImport() {
  const auth = useAuth()
  const client = useQueryClient()
  const [count, setCount] = useState(0)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [message, setMessage] = useState('')
  const started = useRef(false)
  const mounted = useRef(true)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      controller.current?.abort()
    }
  }, [])

  async function save() {
    if (!auth.accessToken || started.current) return
    started.current = true
    controller.current = new AbortController()
    setStatus('saving')
    try {
      const progress = (done: number, total: number) => {
        if (mounted.current)
          setMessage(`Guardando entrenamientos: ${done}/${total}`)
      }
      let imported: number
      try {
        imported = await importGuestTrainings(
          auth.accessToken,
          progress,
          controller.current.signal,
        )
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) throw error
        imported = await importGuestTrainings(
          await auth.renewSession(),
          progress,
          controller.current.signal,
        )
      }
      try {
        sessionStorage.removeItem(guestImportIntentKey)
      } catch {
        /* Optional storage. */
      }
      await client.invalidateQueries({ queryKey: ['training-runs'] })
      if (mounted.current) {
        setCount(0)
        setStatus('saved')
        setMessage(
          imported
            ? 'Tu progreso ya está guardado en tu cuenta.'
            : 'Tu progreso está sincronizado.',
        )
      }
    } catch {
      if (mounted.current) {
        setStatus('error')
        setMessage(
          'No se pudo completar el guardado. Tus entrenamientos pendientes siguen en este dispositivo.',
        )
      }
    } finally {
      started.current = false
    }
  }
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    let active = true
    if (!auth.accessToken) return
    void listGuestTrainings()
      .then((records) => {
        if (!active) return
        setCount(records.length)
        let requested = false
        try {
          requested = sessionStorage.getItem(guestImportIntentKey) === 'true'
        } catch {
          /* Manual import remains available. */
        }
        if (records.length && requested) void saveRef.current()
        else if (!records.length && requested) {
          try {
            sessionStorage.removeItem(guestImportIntentKey)
          } catch {
            /* Optional storage. */
          }
        }
      })
      .catch(() => {
        if (active) {
          setStatus('error')
          setMessage(
            'No se pudo leer el progreso local. Comprueba el almacenamiento del navegador.',
          )
        }
      })
    return () => {
      active = false
    }
  }, [auth.accessToken])

  if (!count && status === 'idle') return null
  return (
    <section className="guest-progress" aria-label="Progreso de invitado">
      <p role={status === 'error' ? 'alert' : 'status'}>
        {message ||
          `Tienes ${count} entrenamiento${count === 1 ? '' : 's'} en este dispositivo.`}
      </p>
      {(status === 'idle' || status === 'error') && (
        <button onClick={() => void save()}>
          {status === 'error'
            ? 'Reintentar guardado'
            : 'Guardar progreso en esta cuenta'}
        </button>
      )}
      {status === 'saving' && (
        <small>Puedes permanecer aquí hasta completar la sincronización.</small>
      )}
    </section>
  )
}
