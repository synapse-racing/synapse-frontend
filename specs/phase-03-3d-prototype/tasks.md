# Fase 3 - Tareas

Actualizado: 2026-08-19

## Especificacion

- [x] F3.1 Definir alcance y criterios de aceptacion.
- [x] F3.2 Documentar arquitectura, fisica y riesgos.
- [x] F3.3 Definir tareas verificables.

## Base 3D

- [x] F3.4 Instalar Three.js, React Three Fiber, Drei y Rapier.
- [x] F3.5 Crear ruta diferida y contenedor del laboratorio.
- [x] F3.6 Configurar Canvas, iluminacion y fisica a timestep fijo.

## Circuito y progreso

- [x] F3.7 Crear definicion de circuito basada en datos.
- [x] F3.8 Renderizar suelo, paredes y colliders.
- [x] F3.9 Implementar checkpoints ordenados y vueltas.

## Vehiculo

- [x] F3.10 Implementar rigid body, collider y aspecto temporal.
- [x] F3.11 Implementar aceleracion, reversa, direccion y limites.
- [x] F3.12 Implementar reinicio y camara de seguimiento.

## Sensores e interfaz

- [x] F3.13 Implementar cinco raycasts fisicos normalizados.
- [x] F3.14 Visualizar rayos y estado de deteccion.
- [x] F3.15 Crear HUD de velocidad, progreso, sensores y controles.
- [x] F3.16 Conectar el dashboard con el laboratorio.

## Calidad y cierre

- [x] F3.17 Probar calculos de sensores y progreso.
- [x] F3.18 Ejecutar lint, pruebas y build.
- [x] F3.19 Registrar evidencia y cerrar la fase.

## Evidencia de verificacion

Ejecutado correctamente el 2026-08-19:

- `pnpm lint`: 0 errores y 0 advertencias.
- `pnpm test`: 6 pruebas aprobadas en 2 archivos.
- `pnpm build`: TypeScript y Vite completados correctamente.
- Dominio probado: direcciones y normalizacion de sensores, rechazo de checkpoints fuera de orden y cierre de vuelta.
- La ruta `/training` se genera como chunk diferido independiente.

## Riesgo registrado

El chunk diferido del laboratorio pesa aproximadamente 3.15 MB minificado y 1.09 MB gzip por Three.js, Rapier y sus utilidades. No forma parte del bundle inicial de autenticacion. Se evaluaran carga progresiva, compresion Brotli y division adicional durante la fase de optimizacion, una vez estabilizada la simulacion NEAT.
