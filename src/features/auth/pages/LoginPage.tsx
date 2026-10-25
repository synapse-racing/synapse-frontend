import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { requestGuestImport } from '../../training/persistence/import-guest-training.ts'
import { ApiError } from '../../../shared/api/http.ts'
import { AuthLayout } from '../components/AuthLayout.tsx'
import { useAuth } from '../context/useAuth.ts'
import { loginSchema, type LoginFormData } from '../schemas/auth.schemas.ts'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const submit = handleSubmit(async (data) => {
    try {
      if (auth.status === 'visitor') requestGuestImport()
      await auth.login(data)
    } catch (error) {
      setError('root', {
        message:
          error instanceof ApiError
            ? error.message
            : 'No se pudo iniciar sesion',
      })
    }
  })

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={submit} noValidate>
        <h2>Iniciar sesion</h2>
        <p className="auth-form__lead">Continua desde tu ultima generacion.</p>

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
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && (
            <span className="field__error">{errors.password.message}</span>
          )}
        </label>

        {errors.root && <p className="form-error">{errors.root.message}</p>}

        <button className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </button>
        <p className="auth-form__switch">
          ¿Primera vez?{' '}
          <Link
            to="/register"
            onClick={() => {
              if (auth.status === 'visitor') requestGuestImport()
            }}
          >
            Crea una cuenta
          </Link>
        </p>
        <div className="auth-form__divider">
          <span>o empieza a probar</span>
        </div>
        <button
          type="button"
          className="guest-button"
          disabled={isSubmitting}
          onClick={() => {
            auth.continueAsGuest()
            navigate('/dashboard')
          }}
        >
          Continuar como invitado <span aria-hidden="true">↗</span>
        </button>
        <p className="auth-form__guest-note">
          Entrena sin cuenta. Tu progreso se guarda en este navegador y puedes
          llevarlo a una cuenta después.
        </p>
      </form>
    </AuthLayout>
  )
}
