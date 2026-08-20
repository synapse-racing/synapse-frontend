# Fase 3 - Diseno del prototipo 3D

## Tecnologias

- `three`: motor grafico.
- `@react-three/fiber`: integracion declarativa con React.
- `@react-three/drei`: controles de teclado y utilidades de escena.
- `@react-three/rapier`: fisica y consultas raycast.
- Rapier: timestep fijo y colliders.

## Arquitectura

```text
features/training/
  domain/
    track.ts
    sensors.ts
    progress.ts
  components/
    TrainingScene.tsx
    Track.tsx
    Vehicle.tsx
    SensorRays.tsx
    TrainingHud.tsx
  pages/
    TrainingPage.tsx
  types/
```

Los modulos de `domain` no importan React, Three ni Rapier cuando el calculo puede expresarse con datos simples. Esto permitira reutilizarlos durante NEAT.

## Circuito inicial

Se utilizara un anillo rectangular para reducir incertidumbre fisica:

- Limite exterior aproximado: 28 x 48 metros.
- Isla interior aproximada: 12 x 32 metros.
- Ancho de carril: 8 metros.
- Cuatro checkpoints, uno por cada sector.
- Spawn en el carril izquierdo orientado hacia el sur.

Cada pared se representa como:

```ts
type WallDefinition = {
  position: [number, number, number]
  size: [number, number, number]
}
```

La misma definicion produce mesh y collider.

## Vehiculo

El primer vehiculo usa un rigid body dinamico con collider cuboide y conduccion arcade:

- Impulso longitudinal para aceleracion y reversa.
- Torque sobre Y para direccion.
- Rotacion X/Z desactivada para evitar vuelcos.
- Amortiguamiento lineal y angular.
- Correccion de velocidad lateral para dar estabilidad.
- Limite de velocidad aplicado sobre el plano XZ.

Este modelo no pretende simular ruedas reales. Su objetivo es ofrecer una dinamica estable y economica para evaluar muchas redes en la Fase 4.

## Sensores

Los angulos locales son `[-60, -30, 0, 30, 60]`. En cada frame:

1. Se calcula la direccion local.
2. Se rota por la orientacion del auto.
3. Rapier ejecuta `castRay` excluyendo el rigid body del auto.
4. La distancia se normaliza como `distance / maxDistance`.
5. Una geometria de linea se actualiza mediante refs.

La telemetria copia los resultados a React cada 100 ms; la simulacion conserva los valores de alta frecuencia en refs.

## Checkpoints

Los checkpoints son colliders `sensor`. Una maquina de progreso pura recibe el indice cruzado:

```text
si crossedIndex != expectedIndex -> no cambia
si coincide y no era el ultimo -> expectedIndex + 1
si coincide y era el ultimo -> vuelta + 1, expectedIndex = 0
```

## Carga y navegacion

`TrainingPage` se carga con `React.lazy`. El Canvas queda aislado de las pantallas de autenticacion. Un `Suspense` visible cubre la descarga del chunk y la inicializacion de Rapier.

## Riesgos controlados

- Fisica demasiado realista: se usa conduccion arcade deliberadamente.
- Sensores detectando el auto: la consulta excluye su rigid body.
- Re-render por frame: refs y telemetria limitada.
- Checkpoints fuera de orden: maquina de estados pura.
- WebGL ausente en tests: se prueban modulos de dominio sin montar Canvas.
