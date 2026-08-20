# Fase 2 - Tareas

Actualizado: 2026-08-19

## Especificacion

- [x] F2.1 Definir requisitos y criterios de aceptacion.
- [x] F2.2 Documentar flujo de tokens, arquitectura y amenazas.
- [x] F2.3 Dividir la implementacion en tareas verificables.

## Persistencia

- [x] F2.4 Agregar modelos `User` y `RefreshSession`.
- [x] F2.5 Crear y aplicar la migracion de autenticacion.
- [x] F2.6 Agregar `UsersModule` y consultas sin datos sensibles.

## Backend

- [x] F2.7 Instalar JWT, Argon2, cookies y throttling.
- [x] F2.8 Extender y validar variables de entorno JWT.
- [x] F2.9 Implementar registro y login.
- [x] F2.10 Implementar rotacion de refresh token y logout.
- [x] F2.11 Implementar guard Bearer y endpoint `me`.
- [x] F2.12 Documentar autenticacion en Swagger.

## Frontend

- [x] F2.13 Instalar React Hook Form y resolver Zod.
- [x] F2.14 Crear cliente HTTP y contratos de autenticacion.
- [x] F2.15 Crear `AuthProvider` con renovacion deduplicada.
- [x] F2.16 Crear formularios y paginas de login y registro.
- [x] F2.17 Crear rutas publicas, protegidas y dashboard.

## Calidad y cierre

- [x] F2.18 Agregar pruebas unitarias y E2E del backend.
- [x] F2.19 Agregar pruebas de autenticacion del frontend.
- [x] F2.20 Actualizar CI para migraciones y PostgreSQL.
- [x] F2.21 Ejecutar lint, pruebas y builds.
- [x] F2.22 Registrar evidencia y cerrar la fase.

## Evidencia de verificacion

Ejecutado correctamente el 2026-08-19:

- PostgreSQL 17 activo y `healthy` mediante Docker Compose.
- Prisma: cliente generado, migracion `20260819165535_init_auth` aplicada y esquema al dia.
- Frontend: `pnpm lint`, 2 pruebas con `pnpm test` y `pnpm build`.
- Backend: `pnpm lint`, 2 pruebas unitarias, 4 pruebas E2E y `pnpm build`.
- E2E cubre health, validacion, registro, duplicados, login valido e invalido, Bearer, rotacion, rechazo de reutilizacion y logout.
