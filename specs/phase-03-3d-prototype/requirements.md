# Fase 3 - Requisitos del prototipo 3D

## Objetivo

Construir una simulacion 3D manual y estable que valide el circuito, la fisica, los controles, los cinco sensores y la medicion de progreso antes de conectar el algoritmo NEAT.

## Alcance

La fase se ejecuta completamente en el frontend. No incluye evolucion NEAT, persistencia de circuitos, modelos 3D definitivos, editor de pistas ni multijugador.

## Requisitos funcionales

### SIM-001 - Escena 3D

El usuario autenticado debe acceder al laboratorio desde `/training`.

**Criterios de aceptacion:**

- La escena contiene iluminacion, suelo, circuito, auto y camara.
- La carga de la escena pesada es diferida para no penalizar login y dashboard.
- Existe una salida clara para volver al dashboard.

### SIM-002 - Circuito

Debe existir un circuito cerrado simple definido mediante datos TypeScript.

**Criterios de aceptacion:**

- El circuito tiene limites exteriores e interiores con colliders fijos.
- Las paredes son visibles en modo de depuracion.
- La definicion separa datos del circuito y renderizado.
- El auto dispone de una posicion y orientacion inicial reproducibles.

### SIM-003 - Auto manual

El usuario debe conducir el auto con teclado.

**Criterios de aceptacion:**

- `W` o flecha arriba acelera.
- `S` o flecha abajo frena y permite reversa.
- `A/D` o flechas controlan la direccion.
- `R` devuelve el auto al punto inicial.
- La velocidad maxima esta limitada.
- El chasis colisiona con las paredes y no puede volcar.

### SIM-004 - Camara

La camara debe seguir al auto de forma suave y mantener visible la direccion de avance.

**Criterios de aceptacion:**

- La camara interpola posicion y objetivo.
- No depende de actualizaciones de estado React por frame.

### SIM-005 - Sensores

El auto debe emitir cinco raycasts fisicos.

**Criterios de aceptacion:**

- Angulos configurados en `-60`, `-30`, `0`, `30` y `60` grados.
- Cada distancia se normaliza entre `0` y `1`.
- Los rayos excluyen el collider del propio auto.
- Los rayos se muestran en verde sin obstaculo y rojo al detectar una pared.
- El panel muestra los cinco valores con una frecuencia limitada.

### SIM-006 - Progreso

El circuito debe medir progreso mediante checkpoints ordenados.

**Criterios de aceptacion:**

- Un checkpoint solo cuenta si es el siguiente esperado.
- Completar todos los checkpoints incrementa la vuelta.
- El panel muestra checkpoint, vueltas, velocidad y sensores.
- Reiniciar devuelve tambien el progreso a cero.

## Requisitos no funcionales

### SIM-NFR-001 - Rendimiento

- La fisica usa timestep fijo de `1/60`.
- Posicion, camara y sensores se actualizan con refs, no con estado React por frame.
- La telemetria visual se limita aproximadamente a 10 actualizaciones por segundo.

### SIM-NFR-002 - Separacion

La definicion de pista, calculo de sensores y maquina de progreso deben ser funciones o modulos independientes de JSX y probables sin WebGL.

### SIM-NFR-003 - Adaptabilidad

La interfaz debe ser utilizable en escritorio y mostrar un aviso en dispositivos sin teclado. Los controles tactiles quedan fuera del MVP de esta fase.

### SIM-NFR-004 - Pruebas

Debe haber pruebas unitarias de angulos/distancias de sensores y orden de checkpoints, ademas de lint y build de produccion.
