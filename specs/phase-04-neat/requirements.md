# Fase 4 - Requisitos del entrenamiento NEAT

## Objetivo

Evolucionar una poblacion de autos autonomos dentro del circuito 3D usando sus cinco raycasts y velocidad como entradas, y direccion y aceleracion como salidas.

## Alcance

Incluye un nucleo NEAT feed-forward, evaluacion fisica local, fitness, generaciones y visualizacion. No incluye persistencia, reanudacion, entrenamiento remoto, Web Worker ni comparacion multijugador.

## Requisitos funcionales

### NEAT-001 - Genoma y red

- El genoma contiene nodos y conexiones con numeros de innovacion.
- La red recibe cinco sensores normalizados y velocidad normalizada.
- Existe un nodo bias.
- Produce direccion y aceleracion en el rango `-1..1`.
- Las redes son feed-forward y evaluables en orden de capa.

### NEAT-002 - Variacion genetica

- Mutacion de pesos.
- Mutacion para agregar conexiones validas.
- Mutacion para dividir una conexion y agregar un nodo.
- Posibilidad de activar o desactivar conexiones.
- Crossover alineado por innovacion que prioriza al progenitor mas apto.

### NEAT-003 - Especiacion

- La distancia de compatibilidad considera genes disjuntos/excedentes y diferencia de pesos.
- Los genomas se agrupan por un umbral configurable.
- La seleccion considera fitness ajustado por especie.
- Se conserva elitismo para evitar perder el mejor genoma.

### NEAT-004 - Reproducibilidad

- La poblacion usa un generador pseudoaleatorio con semilla.
- La misma semilla y evaluaciones producen la misma siguiente generacion.
- Configuracion, semilla y generacion se mantienen en el estado del motor.

### NEAT-005 - Evaluacion 3D

- Se generan al menos 20 autos sin colisionarse entre ellos.
- Cada auto controla fisica usando su propia red y sensores.
- Los autos colisionan con suelo y paredes.
- La generacion termina por colision, estancamiento o tiempo maximo.
- Solo el auto campeon muestra sus raycasts para evitar ruido visual.

### NEAT-006 - Fitness

El fitness debe priorizar progreso valido:

```text
fitness = checkpoints * 1000 + vueltas * 5000 + distancia * 2 + supervivencia - colision
```

- Los checkpoints solo cuentan en orden.
- Permanecer detenido finaliza la evaluacion.
- El fitness nunca es negativo.

### NEAT-007 - Panel de entrenamiento

- Ruta protegida `/training/neat`.
- Inicio, pausa, reanudacion y reinicio con la misma semilla.
- Generacion, vivos, mejor fitness, fitness promedio y especies.
- Enlace al modo manual y al dashboard.
- Evolucion automatica al terminar todos los autos.

## Requisitos no funcionales

### NEAT-NFR-001 - Rendimiento

- Poblacion inicial de 24 autos.
- Timestep fisico fijo.
- Valores por frame en refs, no en estado React.
- Metricas de interfaz limitadas a baja frecuencia.

### NEAT-NFR-002 - Separacion

El motor NEAT no importa React, Three.js ni Rapier. Simulacion, fitness y presentacion dependen del motor, nunca al reves.

### NEAT-NFR-003 - Pruebas

Debe haber pruebas deterministas de evaluacion, mutaciones estructurales, crossover, compatibilidad, especiacion y evolucion de poblacion.

## Restricciones conocidas

- Se usan redes aciclicas por capas. Redes recurrentes quedan para una mejora posterior.
- La evolucion se ejecuta en el hilo principal durante esta fase porque 24 genomas tienen un costo pequeno frente a la fisica. Se reevaluara Web Worker al aumentar poblacion.
- La calidad de aprendizaje se valida observando tendencias entre generaciones; no se garantiza completar el circuito con una cantidad fija de generaciones.
