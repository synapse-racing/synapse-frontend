# Fase 5 - Tareas

Actualizado: 2026-08-19

## Especificacion

- [x] F5.1 Definir requisitos y criterios de aceptacion.
- [x] F5.2 Documentar snapshot, modelo, API y autosave.
- [x] F5.3 Dividir el trabajo en tareas verificables.

## Motor

- [x] F5.4 Serializar y restaurar PRNG e innovaciones.
- [x] F5.5 Implementar snapshot versionado de poblacion.
- [x] F5.6 Probar round-trip y evolucion reproducible.

## Backend

- [x] F5.7 Crear modelos Prisma y migracion.
- [x] F5.8 Implementar endpoints con control de propiedad.
- [x] F5.9 Implementar transaccion de checkpoint y metricas.
- [x] F5.10 Documentar contratos en Swagger.
- [x] F5.11 Agregar pruebas E2E de persistencia y aislamiento.

## Frontend

- [x] F5.12 Crear cliente y contratos de entrenamientos.
- [x] F5.13 Crear selector para nuevo, cargar y eliminar.
- [x] F5.14 Integrar autosave y estado visual.
- [x] F5.15 Restaurar motor desde checkpoint.
- [x] F5.16 Sincronizar estados pausa y ejecucion.

## Cierre

- [x] F5.17 Ejecutar migraciones, lint, pruebas y builds.
- [x] F5.18 Registrar evidencia y cerrar la fase.

## Evidencia de verificacion

Ejecutado correctamente el 2026-08-20:

- PostgreSQL: migracion `20260820005718_training_persistence` aplicada; 2 migraciones al dia.
- Frontend: lint limpio, 14 pruebas aprobadas en 4 archivos y build correcto.
- Backend: lint limpio, 2 pruebas unitarias, 5 pruebas E2E y build correcto.
- Prisma Client generado desde el esquema actualizado.
- Snapshot probado mediante round-trip JSON y comparacion exacta de la siguiente evolucion.
- E2E probado: crear entrenamiento, guardar checkpoint, consultar ultimo checkpoint y metricas, ocultar recursos a otro usuario y borrar en cascada.

## Comportamiento entregado

- Selector para crear, cargar y eliminar entrenamientos.
- Autosave al finalizar cada generacion.
- Indicadores `Guardando`, `Listo` y `Error`.
- Fallos de autosave no detienen la evolucion local.
- Renovacion de access token y reintento unico ante HTTP 401.
- Pausa y ejecucion sincronizadas con PostgreSQL.
- Recarga desde el checkpoint mas reciente.
