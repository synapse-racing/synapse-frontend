# Fase 4 - Diseno tecnico de NEAT

## Modulos del motor

```text
features/training/neat/
  random.ts
  genes.ts
  innovation.ts
  genome.ts
  network.ts
  mutation.ts
  crossover.ts
  compatibility.ts
  species.ts
  population.ts
  config.ts
```

Todos los modulos son TypeScript puro.

## Topologia inicial

```text
Entradas: 5 raycasts + velocidad = 6
Bias: 1
Salidas: direccion + aceleracion = 2
```

La poblacion inicial conecta completamente entradas y bias con las salidas. Los pesos iniciales se generan entre `-1` y `1`.

Cada nodo tiene una capa numerica. Agregar una conexion solo permite `source.layer < target.layer`, evitando ciclos. Al dividir una conexion se crea un nodo en el punto medio de ambas capas.

## Innovaciones

`InnovationTracker` mantiene:

- Siguiente numero de innovacion.
- Siguiente id de nodo.
- Mapa `source->target` a innovacion.
- Mapa de conexion dividida a nodo reutilizable.

Esto permite alinear genes homologos durante crossover.

## Evolucion

1. Recibir fitness por id de genoma.
2. Ordenar y conservar el campeon global.
3. Especiar por distancia al representante.
4. Calcular fitness ajustado `fitness / tamanoEspecie`.
5. Elegir especie y progenitores mediante ruleta ponderada.
6. Aplicar crossover o clonar al progenitor.
7. Aplicar mutaciones.
8. Repetir hasta recuperar el tamano de poblacion.

## Simulacion

`NeatVehicle` reutiliza la misma fisica arcade y sensores del prototipo manual. Cada frame:

1. Lee cinco distancias.
2. Normaliza velocidad contra la velocidad maxima.
3. Evalua el genoma.
4. Aplica direccion y aceleracion.
5. Acumula distancia, tiempo y estancamiento.

Los colliders de autos pertenecen a un grupo que colisiona con pista pero no con otros autos.

## Coordinador generacional

`NeatTrainingPage` conserva el motor en una ref y usa estado React solo para:

- Lista de genomas al iniciar una generacion.
- Estado `idle`, `running`, `paused` o `evolving`.
- Contador de vivos y metricas agregadas.
- Senal de finalizacion forzada por timeout.

Los registros por auto y fitness viven en maps mutables. Al finalizar todos, el motor evoluciona y React monta la nueva generacion.

## Fitness

```text
checkpoints * 1000
+ laps * 5000
+ traveledDistance * 2
+ aliveSeconds
- collisionPenalty (100)
```

Se aplica `max(0, fitness)`. Checkpoints y vueltas dominan sobre movimiento local para evitar premiar autos que giran sin progresar.

## Visualizacion

- Camara orbital elevada para observar toda la poblacion.
- Colores por indice, con campeon resaltado.
- Raycasts visibles solo para el primer genoma de la generacion.
- HUD DOM separado de Canvas.

## Decisiones aplazadas

- Persistencia de genomas y metricas: Fase 5.
- Web Worker: cuando el profiling justifique su complejidad.
- Redes recurrentes: fuera del MVP.
- Paralelizacion o simulacion sin render: optimizacion posterior.
