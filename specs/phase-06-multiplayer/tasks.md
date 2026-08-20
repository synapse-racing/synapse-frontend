# Fase 6 - Tareas

Actualizado: 2026-08-20

## Especificacion

- [x] F6.1 Definir requisitos, eventos y criterios de aceptacion.
- [x] F6.2 Documentar autoridad, frecuencias y restricciones.
- [x] F6.3 Dividir trabajo en tareas verificables.

## Backend

- [x] F6.4 Instalar WebSockets y Socket.IO.
- [x] F6.5 Implementar simulacion 2D y reglas de pista.
- [x] F6.6 Implementar RoomService y ciclo de vida de salas.
- [x] F6.7 Implementar gateway autenticado y eventos.
- [x] F6.8 Implementar tick, snapshots y resultados.
- [x] F6.9 Probar simulacion y salas.

## Frontend

- [x] F6.10 Instalar Socket.IO Client y contratos.
- [x] F6.11 Implementar conexion y manejo de errores.
- [x] F6.12 Implementar crear, unirse, ready y lobby.
- [x] F6.13 Implementar publicacion limitada de inputs.
- [x] F6.14 Implementar escena, interpolacion y HUD de carrera.
- [x] F6.15 Implementar resultados, abandono y navegacion.
- [x] F6.16 Probar lobby sin WebGL.

## Cierre

- [x] F6.17 Ejecutar lint, pruebas y builds.
- [x] F6.18 Registrar evidencia y cerrar la fase.

## Evidencia de verificacion

Ejecutado correctamente el 2026-08-20:

- Frontend: lint limpio, 15 pruebas aprobadas en 5 archivos y build correcto.
- Backend: lint limpio, 7 pruebas unitarias, 6 pruebas E2E y build correcto.
- E2E Socket.IO: handshake JWT, namespace `/multiplayer` y creacion de sala privada real.
- Simulacion probada: superficie valida, secuencias antiguas, checkpoint ordenado y desconexion.
- Salas probadas: capacidad, entrada case-insensitive, ready, permisos de host, inicio y transferencia de host.
- Pagina multijugador diferida: aproximadamente 15.8 KB gzip, sin incluir el chunk 3D compartido.

## Comportamiento entregado

- Salas privadas de 2 a 4 jugadores con codigo de 6 caracteres.
- Lobby, host, ready y cuenta regresiva de 3 segundos.
- Inputs a 20 Hz, simulacion backend a 20 Hz y snapshots a 10 Hz.
- Posicion, checkpoints, vuelta y ganador calculados por NestJS.
- Interpolacion 3D de autos remotos.
- Clasificacion final y manejo de abandono/desconexion.

## Limitaciones aceptadas

- Las salas se pierden al reiniciar el backend.
- No hay Redis, matchmaking, espectadores ni chat.
- No hay prediccion local ni compensacion de lag.
- Los autos no colisionan entre si.
- Se ejecuta una vuelta por carrera.
