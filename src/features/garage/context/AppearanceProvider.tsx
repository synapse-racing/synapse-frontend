import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/context/useAuth.ts'
import { ApiError } from '../../../shared/api/http.ts'
import {
  defaultAppearance,
  parseAppearance,
  type VehicleAppearance,
} from '../domain/appearance.ts'
import {
  getAppearance,
  saveAppearance,
  type AppearanceResponse,
} from '../api/appearance.api.ts'
import {
  guestAppearanceKey,
  readGuestAppearance,
  saveGuestAppearance,
} from '../persistence/guest-appearance.ts'
import { AppearanceContext } from './appearance-context.ts'

export function AppearanceProvider({ children }: PropsWithChildren) {
  const auth = useAuth()
  const client = useQueryClient()
  const localOnly = auth.status === 'visitor'
  const owner =
    auth.status === 'authenticated' && auth.user ? auth.user.id : auth.status
  const [guestAppearance, setGuestAppearance] = useState(readGuestAppearance)
  const [draft, setDraft] = useState<{
    owner: string
    appearance: VehicleAppearance
  } | null>(null)
  const [savingOwner, setSavingOwner] = useState<string | null>(null)
  const inFlight = useRef(new Set<string>())
  const activeOwner = useRef(owner)
  useEffect(() => {
    activeOwner.current = owner
  }, [owner])
  const key = ['vehicle-appearance', owner]

  async function authorized<T>(operation: (token: string) => Promise<T>) {
    if (!auth.accessToken)
      throw new Error('Inicia sesión para guardar tu auto.')
    try {
      return await operation(auth.accessToken)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        if (activeOwner.current !== owner)
          throw new Error('La sesión cambió. Vuelve a abrir el garaje.')
        const token = await auth.renewSession()
        if (activeOwner.current !== owner)
          throw new Error('La sesión cambió. Vuelve a abrir el garaje.')
        return operation(token)
      }
      throw error
    }
  }

  const query = useQuery({
    queryKey: key,
    enabled: auth.status === 'authenticated' && Boolean(auth.user),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: () => authorized(getAppearance),
  })
  const appearance = localOnly
    ? (guestAppearance ?? defaultAppearance)
    : (parseAppearance(query.data?.appearance) ?? defaultAppearance)
  const preview = useCallback(
    (value: VehicleAppearance | null) => {
      setDraft(value ? { owner, appearance: value } : null)
    },
    [owner],
  )

  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === guestAppearanceKey || event.key === null)
        setGuestAppearance(readGuestAppearance())
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])

  async function save(value: VehicleAppearance) {
    const parsed = parseAppearance(value)
    if (!parsed)
      throw new Error('Revisa los colores y usa un número entre 1 y 99.')
    if (inFlight.current.has(owner))
      throw new Error('Espera a que termine el guardado actual.')
    inFlight.current.add(owner)
    setSavingOwner(owner)
    try {
      if (localOnly) setGuestAppearance(saveGuestAppearance(parsed))
      else {
        const response = await authorized((token) =>
          saveAppearance(token, parsed),
        )
        client.setQueryData<AppearanceResponse>(key, response)
      }
    } finally {
      inFlight.current.delete(owner)
      setSavingOwner((current) => (current === owner ? null : current))
    }
  }

  return (
    <AppearanceContext
      value={{
        appearance,
        displayAppearance:
          draft?.owner === owner ? draft.appearance : appearance,
        guestAppearance,
        owner,
        localOnly,
        loading: auth.status === 'authenticated' && query.isPending,
        loadError: auth.status === 'authenticated' && query.isError,
        saving: savingOwner === owner,
        preview,
        save,
        reload: () => {
          void query.refetch()
        },
      }}
    >
      {children}
    </AppearanceContext>
  )
}
