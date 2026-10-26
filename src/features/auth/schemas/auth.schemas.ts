import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(1, 'Ingresa tu contraseña').max(72),
})

export const registerSchema = loginSchema.extend({
  username: z
    .string()
    .min(3, 'Usa al menos 3 caracteres')
    .max(32, 'Usa como máximo 32 caracteres')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Solo se permiten letras, números y guion bajo',
    ),
  password: z
    .string()
    .min(10, 'Usa al menos 10 caracteres')
    .max(72, 'Usa como máximo 72 caracteres'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
