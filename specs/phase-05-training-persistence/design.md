# Fase 5 - Diseno de persistencia

## Modelo de datos

```text
TrainingRun
- id UUID
- userId UUID
- name
- status: PAUSED | RUNNING | COMPLETED
- seed
- currentGeneration
- bestFitness
- config JSON
- bestGenome JSON nullable
- createdAt / updatedAt / startedAt / finishedAt

TrainingCheckpoint
- id UUID
- trainingRunId UUID
- generation
- snapshot JSON
- createdAt
- unique(trainingRunId, generation)

GenerationMetric
- id UUID
- trainingRunId UUID
- generation
- bestFitness
- averageFitness
- speciesCount
- durationMs
- createdAt
- unique(trainingRunId, generation)
```

Las relaciones usan `onDelete: Cascade`.

## Snapshot NEAT v1

```ts
type NeatPopulationSnapshot = {
  version: 1
  seed: number
  config: NeatConfig
  generation: number
  nextGenomeId: number
  randomState: number
  innovations: InnovationSnapshot
  genomes: Genome[]
}
```

`NeatPopulation.toSnapshot()` genera datos planos. `NeatPopulation.fromSnapshot()` valida version, crea una instancia y restaura todos los estados mutables. El round-trip se prueba evolucionando ambos motores con los mismos fitness.

## Backend

```text
modules/training/
  application/training.service.ts
  presentation/training.controller.ts
  presentation/dto/
  training.module.ts
```

El servicio usa una consulta compuesta `id + userId` para toda lectura o mutacion. Guardar checkpoint ejecuta una transaccion con:

1. Verificar propiedad.
2. Upsert de checkpoint.
3. Upsert de metrica.
4. Actualizar generacion, estado, mejor fitness y mejor genoma.

## API

```text
POST   /api/training-runs
GET    /api/training-runs
GET    /api/training-runs/:id
PATCH  /api/training-runs/:id/status
DELETE /api/training-runs/:id
POST   /api/training-runs/:id/checkpoints
GET    /api/training-runs/:id/checkpoints/latest
GET    /api/training-runs/:id/metrics
GET    /api/training-runs/:id/best-genome
```

## Frontend

La pagina NEAT incorpora un selector previo:

- Crear entrenamiento nuevo.
- Cargar uno existente.
- Eliminar entrenamiento.
- Mostrar fecha, generacion y fitness.

El estado local conserva `trainingRunId` y nombre. Al finalizar una generacion:

1. Evoluciona localmente.
2. Genera snapshot de la nueva poblacion.
3. Envia snapshot, metrica completada y campeon.
4. Continua la simulacion sin esperar la red.

El autosave usa el access token en memoria. Si recibe 401 puede renovar la sesion una vez y repetir la solicitud.

## Decisiones

- PostgreSQL JSONB es suficiente para poblaciones de 24 genomas.
- Se guarda cada generacion durante el MVP para simplificar recuperacion.
- No se comprime JSON inicialmente; se medira el tamano antes de introducir blobs.
- El mejor genoma se duplica en `TrainingRun` para consulta rapida.
