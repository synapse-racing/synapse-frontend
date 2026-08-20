# Fase 6 - Requisitos de multijugador

## Objetivo

Permitir que usuarios autenticados creen salas privadas, preparen una carrera y compitan en tiempo real con posiciones y resultados determinados por el servidor.

## Alcance

Incluye salas efimeras de 2 a 4 jugadores, lobby, ready, una vuelta, simulacion autoritativa, snapshots, interpolacion y resultados. No incluye matchmaking, chat, Redis, espectadores, reconexion avanzada, persistencia de salas ni colisiones entre autos.

## Requisitos funcionales

### MULTI-001 - Conexion autenticada

- El cliente conecta al namespace `/multiplayer` con access token.
- El servidor verifica JWT y usuario antes de aceptar eventos.
- Conexiones invalidas reciben un error de autenticacion y se desconectan.
- Cookies y secretos nunca se incluyen en eventos.

### MULTI-002 - Salas privadas

- Un usuario crea una sala y obtiene codigo de 6 caracteres.
- Puede elegir capacidad entre 2 y 4 jugadores.
- Otro usuario entra mediante codigo sin distinguir mayusculas.
- No se puede estar en dos salas simultaneamente.
- Sala inexistente o llena produce error explicito.
- El host se transfiere si abandona el lobby.

### MULTI-003 - Lobby

- La sala publica host, estado y lista de jugadores.
- Cada jugador puede alternar preparado/no preparado.
- Solo el host inicia.
- Se requieren al menos 2 jugadores y todos preparados.
- La carrera comienza tras una cuenta regresiva de 3 segundos.

### MULTI-004 - Inputs

El cliente envia unicamente:

```text
sequence
steering: -1..1
throttle: -1..1
```

- El servidor ignora secuencias antiguas.
- Valores se validan y limitan.
- El cliente nunca envia posiciones ni resultados.

### MULTI-005 - Simulacion autoritativa

- Servidor a 20 ticks por segundo.
- Snapshots a 10 Hz.
- Posicion, orientacion, velocidad, checkpoints, vueltas y meta se calculan en NestJS.
- Salir del asfalto revierte el movimiento y reduce velocidad.
- Los checkpoints deben cruzarse en orden.
- La carrera termina al completar una vuelta o por timeout de 3 minutos.

### MULTI-006 - Cliente de carrera

- Render 3D del circuito y todos los jugadores.
- Interpolacion visual entre snapshots.
- WASD o flechas generan inputs a frecuencia limitada.
- HUD con codigo, cuenta regresiva, vuelta, posicion y estado de red.
- Resultado final ordenado por llegada y progreso.

### MULTI-007 - Desconexion

- Salir del lobby elimina al jugador y actualiza la sala.
- Desconectarse en carrera lo marca como desconectado.
- Una sala vacia se elimina y detiene su loop.
- El cliente muestra errores y permite volver al inicio multijugador.

## Requisitos no funcionales

### MULTI-NFR-001 - Seguridad

- Validacion de todos los payloads WebSocket.
- Limite efectivo de inputs por tick y secuencia monotona.
- Estado interno no confiado al cliente.
- Mensajes de error sin datos internos.

### MULTI-NFR-002 - Rendimiento

- Un timer por carrera, no uno por jugador.
- Los snapshots contienen solo estado necesario.
- React interpola mediante refs y no actualiza posicion DOM por frame.

### MULTI-NFR-003 - Consistencia

- Eventos y payloads tienen contratos TypeScript equivalentes en frontend y backend.
- El servidor es la unica fuente de verdad del ganador.

### MULTI-NFR-004 - Pruebas

- Simulacion, limites de pista, secuencias, checkpoints y clasificacion.
- Creacion, entrada, ready, permisos del host y abandono de salas.
- Cliente de lobby probado sin WebGL.
