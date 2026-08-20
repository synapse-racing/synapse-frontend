import { environment } from '../config/environment.ts'

interface ApiRequestOptions extends RequestInit {
  token?: string | null
}

interface ErrorBody {
  message?: string | string[]
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(
  path: string,
  { token, headers, ...options }: ApiRequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers)
  if (options.body) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${environment.apiUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: requestHeaders,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ErrorBody
    const message = Array.isArray(body.message)
      ? body.message.join('. ')
      : (body.message ?? 'No se pudo completar la solicitud')
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
