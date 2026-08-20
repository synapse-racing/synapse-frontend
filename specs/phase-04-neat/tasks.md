# Fase 4 - Tareas

Actualizado: 2026-08-19

## Especificacion

- [x] F4.1 Definir requisitos y criterios de aceptacion.
- [x] F4.2 Documentar topologia, evolucion, fitness y restricciones.
- [x] F4.3 Dividir el trabajo en tareas verificables.

## Motor NEAT

- [x] F4.4 Implementar PRNG con semilla y configuracion.
- [x] F4.5 Implementar genes, genoma, innovaciones y evaluacion.
- [x] F4.6 Implementar mutaciones de peso, conexion, nodo y estado.
- [x] F4.7 Implementar crossover y distancia de compatibilidad.
- [x] F4.8 Implementar especies, seleccion, elitismo y poblacion.

## Simulacion

- [x] F4.9 Compartir reglas de conduccion entre auto manual y autonomo.
- [x] F4.10 Implementar auto autonomo y grupos de colision.
- [x] F4.11 Implementar seguimiento de checkpoints, distancia y estancamiento.
- [x] F4.12 Implementar timeout y ciclo de generaciones.

## Interfaz

- [x] F4.13 Crear escena y ruta `/training/neat`.
- [x] F4.14 Crear HUD con controles y metricas.
- [x] F4.15 Conectar modos manual y NEAT desde la navegacion.

## Calidad

- [x] F4.16 Probar red, mutaciones, crossover y compatibilidad.
- [x] F4.17 Probar reproducibilidad, especiacion y evolucion.
- [x] F4.18 Ejecutar lint, pruebas y build.
- [x] F4.19 Registrar evidencia y cerrar la fase.

## Evidencia de verificacion

Ejecutado correctamente el 2026-08-19:

- `pnpm lint`: 0 errores y 0 advertencias.
- `pnpm test`: 12 pruebas aprobadas en 3 archivos.
- `pnpm build`: TypeScript y Vite completados correctamente.
- Motor probado: red feed-forward, bias, mutacion de nodo y conexion, crossover, compatibilidad, especiacion, elitismo, tamano y reproducibilidad.
- Dominio probado: fitness prioriza checkpoints sobre distancia local.
- Bundle: pagina NEAT aproximadamente 9.6 KB gzip, separada del chunk compartido Three/Rapier.

## Validacion operativa

- Poblacion inicial de 24 genomas.
- Dos salidas controlan direccion y aceleracion/reversa.
- Los autos no colisionan entre si, pero si con pista y paredes.
- Finalizacion por colision, cuatro segundos sin movimiento o 28 segundos de generacion.
- Ciclo automatico de evaluacion, evolucion y siguiente generacion.
- Reinicio reconstruye la poblacion con la misma semilla `42170`.
