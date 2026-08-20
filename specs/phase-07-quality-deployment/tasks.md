# Fase 7 - Tareas

Actualizado: 2026-08-20

## Especificacion

- [x] F7.1 Definir requisitos operativos y criterios de aceptacion.
- [x] F7.2 Documentar topologia, imagenes y riesgos.
- [x] F7.3 Dividir trabajo en tareas verificables.

## Backend

- [x] F7.4 Agregar liveness y readiness con pruebas.
- [x] F7.5 Configurar shutdown hooks, proxy y limite de payload.
- [x] F7.6 Ocultar Swagger en produccion.
- [x] F7.7 Crear Dockerfile, entrypoint y dockerignore.

## Frontend

- [x] F7.8 Separar Track visual de colliders Rapier.
- [x] F7.9 Soportar API relativa y Socket.IO same-origin.
- [x] F7.10 Agregar error boundary global.
- [x] F7.11 Crear Dockerfile, Nginx y dockerignore.

## Operacion

- [x] F7.12 Crear Compose de produccion.
- [x] F7.13 Actualizar CI para construir imagenes.
- [x] F7.14 Documentar despliegue, migraciones, TLS y backups.

## Cierre

- [x] F7.15 Ejecutar lint, pruebas y builds.
- [x] F7.16 Validar Dockerfiles y Compose.
- [x] F7.17 Registrar evidencia y cerrar la fase.

## Evidencia

- Backend: lint sin errores, 9 pruebas unitarias, 7 E2E y build NestJS correctos.
- Frontend: lint sin errores, 16 pruebas y build Vite correctos.
- Bundle: multijugador importa `TrackVisual` sin dependencia de Rapier; Three/Rapier permanece diferido para rutas 3D.
- Docker: ambas imagenes multi-stage construidas localmente; procesos verificados con UID no root 1000 y 101.
- Compose: configuracion validada y stack aislado iniciado con los tres servicios saludables.
- Smoke test: readiness proxificado devolvio `database: up` y la recarga directa de `/training/neat` devolvio la SPA con `Cache-Control: no-store`.
- Migraciones: una base vacia aplico las 2 migraciones versionadas antes del arranque de NestJS.
