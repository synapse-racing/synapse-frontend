# Fase 7 - Diseno operativo

## Topologia de produccion

```text
Internet / TLS proxy
        |
     Frontend :80 (Nginx)
       |            |
     /api       /socket.io
       |            |
       +--- Backend :3000
                 |
             PostgreSQL :5432
```

El navegador usa rutas relativas y mantiene frontend, REST y WebSocket bajo el mismo origen. Esto simplifica cookies, CORS y despliegue.

## Backend Docker

Etapas:

1. `deps`: instalar con lockfile y scripts permitidos.
2. `build`: generar Prisma y compilar NestJS.
3. `runtime`: copiar `dist`, Prisma, migraciones y dependencias productivas.

El entrypoint ejecuta `prisma migrate deploy` antes de iniciar. El proceso corre como usuario `node`.

## Frontend Docker

1. Node compila Vite con `VITE_API_URL=/api`.
2. Nginx sirve `dist`.
3. `try_files` redirige rutas desconocidas a `index.html`.
4. Proxy WebSocket conserva `Upgrade` y `Connection`.

## Healthchecks

- Liveness no consulta dependencias.
- Readiness ejecuta `SELECT 1` mediante Prisma.
- Docker backend consulta readiness.
- Frontend consulta `/healthz` de Nginx.

## Optimizacion frontend

`TrackVisual` contiene solo meshes Three.js. `Track` agrega colliders Rapier para entrenamiento. Multijugador importa `TrackVisual`, evitando cargar el motor fisico cliente que no usa para autoridad.

## Manejo de errores

`AppErrorBoundary` captura errores de render y chunks. Ofrece recargar o volver al inicio. Errores de red permanecen en cada feature porque requieren acciones contextuales.

## Compose

- `postgres`: volumen y healthcheck.
- `backend`: espera DB saludable, recibe secretos y no publica puerto al host.
- `frontend`: espera backend saludable y publica `APP_PORT`.

Variables obligatorias:

```text
POSTGRES_PASSWORD
DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
PUBLIC_APP_URL
```

## Riesgos residuales

- Rapier/Three sigue siendo un chunk grande para entrenamiento.
- Salas multijugador siguen en memoria y no soportan replicas.
- TLS y backups dependen de la plataforma elegida.
