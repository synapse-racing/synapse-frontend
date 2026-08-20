# Fase 2 - Diseno de autenticacion

## Flujo de tokens

```text
registro/login
  -> access JWT en JSON (15 min)
  -> refresh JWT en cookie HttpOnly (30 dias)

recarga del navegador
  -> POST /auth/refresh con cookie
  -> revoca la sesion anterior
  -> crea nueva sesion y cookie
  -> conserva access token solo en memoria
```

El access token no se guardara en `localStorage` ni `sessionStorage`. Esto reduce la exposicion ante XSS. La cookie refresh no es accesible desde JavaScript y usa `SameSite=Lax`.

## Modelo de datos

```text
User
- id: UUID
- email: unique
- username: unique
- passwordHash
- createdAt
- updatedAt

RefreshSession
- id: UUID
- userId
- tokenHash
- expiresAt
- revokedAt nullable
- createdAt
```

El JWT refresh contiene `sub` con el usuario, `sid` con la sesion y `type=refresh`. El JWT access contiene `sub`, `email`, `username` y `type=access`.

## Backend

```text
modules/
  users/
    users.module.ts
    users.service.ts
  auth/
    application/auth.service.ts
    domain/auth.types.ts
    infrastructure/access-token.guard.ts
    presentation/auth.controller.ts
    presentation/dto/
    auth.module.ts
```

- `AuthController`: HTTP, cookies, DTO y codigos de respuesta.
- `AuthService`: casos de uso y rotacion de sesiones.
- `UsersService`: consultas y creacion segura de usuarios.
- `AccessTokenGuard`: verifica Bearer JWT e incorpora el usuario autenticado a la request.
- Prisma: restricciones unicas y transacciones de rotacion.

## Frontend

```text
features/auth/
  api/
  components/
  context/
  pages/
  schemas/
  types/
pages/DashboardPage.tsx
shared/api/
```

`AuthProvider` mantiene `user`, `accessToken` y estado de inicializacion. Una promesa compartida deduplica la renovacion inicial para soportar `StrictMode` sin rotar dos veces la misma cookie.

Los formularios usan React Hook Form y Zod. El cliente HTTP siempre incluye credenciales para permitir la cookie y agrega Bearer cuando corresponde.

## API

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

Respuesta de registro, login y refresh:

```json
{
  "accessToken": "jwt",
  "user": {
    "id": "uuid",
    "email": "driver@example.com",
    "username": "driver",
    "createdAt": "2026-08-19T00:00:00.000Z"
  }
}
```

## Decisiones de seguridad

- Normalizar email con `trim().toLowerCase()`.
- No normalizar silenciosamente el nombre de usuario.
- Responder `Invalid credentials` tanto para correo inexistente como contrasena incorrecta.
- Comparar hashes unicamente mediante Argon2.
- Revocar primero la sesion anterior durante la rotacion.
- Limitar login y registro a 5 solicitudes por minuto por cliente.
- Ocultar authorization y cookies en logs Pino.

## Estrategia de pruebas

- Unitarias: servicio de autenticacion y guard de access token.
- E2E con PostgreSQL: registro, duplicados, login, me, refresh y logout.
- Frontend: redireccion de visitante, formulario y dashboard autenticado.
- CI backend: servicio PostgreSQL y migraciones antes de E2E.
