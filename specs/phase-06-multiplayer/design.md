# Fase 6 - Diseno multijugador

## Arquitectura

```text
React                               NestJS
Socket.IO Client  <------------>  MultiplayerGateway
Race Canvas                        RoomService
InputPublisher                     RaceSimulation (20 Hz)
SnapshotInterpolator               Snapshot broadcast (10 Hz)
```

Las salas viven en memoria porque esta fase usa una sola instancia backend. Redis se agregara antes de escalar horizontalmente.

## Eventos

Cliente a servidor:

```text
room:create  { maxPlayers }
room:join    { code }
room:leave
player:ready { ready }
race:start
race:input   { sequence, steering, throttle }
```

Servidor a cliente:

```text
room:state
race:start
race:snapshot
race:finish
server:error
```

## Estado de sala

```ts
type Room = {
  code: string
  hostUserId: string
  status: 'LOBBY' | 'COUNTDOWN' | 'RACING' | 'FINISHED'
  maxPlayers: number
  players: Map<string, RoomPlayer>
  race?: RaceSimulation
}
```

El socket se une al room de Socket.IO `room:<code>`. `RoomService` mantiene indices por codigo y socket.

## Simulacion

La simulacion backend es 2D y determinista, sin Three/Rapier:

- Estado: `x`, `z`, `yaw`, `speed`.
- Aceleracion, reversa, drag y giro dependen de timestep fijo `0.05`.
- Limite exterior rectangular e isla interior representan el mismo anillo del frontend.
- Si el nuevo punto no es conducible se restaura el anterior y la velocidad rebota reducida.
- Checkpoints son zonas rectangulares con deteccion de entrada.

Esto evita ejecutar un motor grafico en NestJS y mantiene autoridad suficiente para el MVP.

## Frecuencias

- Tick: 20 Hz.
- Snapshot: cada 2 ticks, 10 Hz.
- Inputs cliente: 20 Hz como maximo.
- Render: frecuencia del navegador con interpolacion exponencial.

## Clasificacion

1. Jugadores terminados por `finishTimeMs`.
2. Vueltas descendentes.
3. Checkpoints descendentes.
4. Distancia al siguiente checkpoint como mejora futura.

## Autenticacion

El cliente envia `auth: { token }` en el handshake. El gateway verifica el access JWT con `JwtService`, valida `type=access`, consulta el usuario y almacena identidad segura en `socket.data.user`.

## Frontend

```text
features/multiplayer/
  api/multiplayer.socket.ts
  components/MultiplayerLobby.tsx
  components/MultiplayerRace.tsx
  components/RaceInputPublisher.tsx
  pages/MultiplayerPage.tsx
  types/multiplayer.ts
```

La pagina mantiene una sola conexion durante su montaje. Los snapshots actualizan objetivos; meshes interpolan sus transforms con `useFrame`.

## Restricciones

- Sin compensacion de lag ni prediccion local en esta primera version.
- Sin colisiones entre jugadores.
- Si el proceso backend reinicia, las salas se pierden.
- Una vuelta por carrera para mantener sesiones cortas durante pruebas.
