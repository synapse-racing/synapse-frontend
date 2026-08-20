import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../shared/api/http.ts'
import { AuthLayout } from '../components/AuthLayout.tsx'
import { useAuth } from '../context/useAuth.ts'
import {
  registerSchema,
  type RegisterFormData,
} from '../schemas/auth.schemas.ts'

export function RegisterPage() {
  const auth = useAuth()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

  const submit = handleSubmit(async (data) => {
    try {
      await auth.register(data)
    } catch (error) {
      setError('root', {
        message:
          error instanceof ApiError
            ? error.message
            : 'No se pudo crear la cuenta',
      })
    }
  })

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={submit} noValidate>
        <h2>Crear cuenta</h2>
        <p className="auth-form__lead">Prepara tu primer laboratorio NEAT.</p>

        <label className="field">
          Nombre de usuario
          <input autoComplete="username" {...register('username')} />
          {errors.username && (
            <span className="field__error">{errors.username.message}</span>
          )}
        </label>

        <label className="field">
          Correo
          <input type="email" autoComplete="email" {...register('email')} />
          {errors.email && (
            <span className="field__error">{errors.email.message}</span>
          )}
        </label>

        <label className="field">
          Contrasena
          <input
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
          {errors.password && (
            <span className="field__error">{errors.password.message}</span>
          )}
        </label>

        {errors.root && <p className="form-error">{errors.root.message}</p>}

        <button className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
        <p className="auth-form__switch">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
