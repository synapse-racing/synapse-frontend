import { z } from 'zod'

const environmentSchema = z.object({
  VITE_API_URL: z.string().refine(
    (value) => value.startsWith('/') || URL.canParse(value),
    'VITE_API_URL must be an absolute URL or root-relative path',
  ),
})

const parsedEnvironment = environmentSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
})

export const environment = {
  apiUrl: parsedEnvironment.VITE_API_URL,
}
