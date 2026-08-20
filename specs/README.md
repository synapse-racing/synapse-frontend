# Especificaciones de Synapse Racing

Este directorio es la fuente de verdad del desarrollo spec-driven. Cada fase contiene:

- `requirements.md`: alcance, requisitos y criterios de aceptacion.
- `design.md`: decisiones tecnicas y arquitectura de la solucion.
- `tasks.md`: tareas trazables y estado real de implementacion.

## Estados

- `[ ]`: pendiente.
- `[~]`: en curso o parcialmente verificado.
- `[x]`: completado y verificado.
- `[!]`: bloqueado, con la causa documentada.

## Fases

| Fase | Nombre | Estado | Especificacion |
|---|---|---|---|
| 1 | Base tecnica | Completada | [phase-01-foundation](./phase-01-foundation/) |
| 2 | Autenticacion | Completada | [phase-02-authentication](./phase-02-authentication/) |
| 3 | Prototipo 3D | Completada | [phase-03-3d-prototype](./phase-03-3d-prototype/) |
| 4 | NEAT | Completada | [phase-04-neat](./phase-04-neat/) |
| 5 | Persistencia de entrenamientos | Completada | [phase-05-training-persistence](./phase-05-training-persistence/) |
| 6 | Multijugador | Completada | [phase-06-multiplayer](./phase-06-multiplayer/) |
| 7 | Calidad y despliegue | Completada | [phase-07-quality-deployment](./phase-07-quality-deployment/) |

## Flujo de trabajo

1. Escribir y revisar los requisitos de la fase.
2. Documentar el diseno y las decisiones relevantes.
3. Dividir el trabajo en tareas con criterios verificables.
4. Implementar una tarea a la vez.
5. Ejecutar las verificaciones asociadas.
6. Actualizar `tasks.md` y este indice con el resultado real.
7. Cerrar la fase antes de comenzar la siguiente.

El alcance general del producto se encuentra en [`../PROJECT_PLAN.md`](../PROJECT_PLAN.md).

La Fase 1 esta implementada y verificada, incluido el healthcheck de PostgreSQL mediante Docker Compose.
