# Fase 1 - Tareas

Actualizado: 2026-08-19

## Especificacion

- [x] F1.1 Inspeccionar las plantillas y herramientas disponibles.
- [x] F1.2 Documentar requisitos y criterios de aceptacion.
- [x] F1.3 Documentar el diseno tecnico.
- [x] F1.4 Registrar que Docker no esta instalado localmente.

## Gestor de paquetes

- [x] F1.5 Declarar pnpm 11.22.0 mediante Corepack en ambos proyectos.
- [x] F1.6 Eliminar el lockfile de npm del frontend.
- [x] F1.7 Generar el lockfile pnpm del backend.

## Frontend

- [x] F1.8 Instalar React Router, TanStack Query y dependencias de pruebas.
- [x] F1.9 Crear proveedores, router, configuracion de entorno y paginas base.
- [x] F1.10 Agregar una prueba de renderizado.
- [x] F1.11 Documentar instalacion y comandos del frontend.

## Backend

- [x] F1.12 Instalar configuracion, validacion, Swagger, Helmet y Pino.
- [x] F1.13 Validar variables de entorno y crear `.env.example`.
- [x] F1.14 Configurar prefijo, CORS, validacion, seguridad, logs y Swagger.
- [x] F1.15 Reemplazar el ejemplo de Nest por `GET /api/health`.
- [x] F1.16 Agregar pruebas unitarias y E2E del health check.

## Persistencia

- [x] F1.17 Instalar y configurar Prisma.
- [x] F1.18 Crear `DatabaseModule` y `PrismaService`.
- [x] F1.19 Crear Docker Compose para PostgreSQL.
- [x] F1.20 Arrancar PostgreSQL y comprobar su healthcheck.

## Automatizacion y cierre

- [x] F1.21 Crear workflows de GitHub Actions para ambos repositorios.
- [x] F1.22 Documentar instalacion y comandos del backend.
- [x] F1.23 Ejecutar lint, pruebas y build del frontend.
- [x] F1.24 Ejecutar generacion Prisma, lint, pruebas y build del backend.
- [x] F1.25 Revisar los criterios de aceptacion y cerrar la implementacion de la fase.

## Evidencia de verificacion

Ejecutado correctamente el 2026-08-19:

- Frontend: `pnpm lint`, `pnpm test` y `pnpm build`.
- Backend: `pnpm prisma:generate`, `pnpm lint`, `pnpm test --runInBand`, `pnpm test:e2e --runInBand` y `pnpm build`.
- Resultado: 1 prueba de frontend, 1 prueba unitaria de backend y 1 prueba E2E aprobadas.
- Docker: `docker compose up -d --wait` completo con PostgreSQL en estado `Healthy`.
