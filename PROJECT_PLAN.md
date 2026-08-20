# Synapse Racing - Plan del proyecto

## Objetivo

Crear una plataforma web de carreras con dos modos principales:

1. **Entrenamiento:** evolucionar autos mediante el algoritmo NEAT dentro de un circuito 3D.
2. **Multijugador:** crear salas privadas y competir en tiempo real con otros jugadores.

El usuario debe registrarse o iniciar sesion antes de acceder a estos modos.

## Arquitectura general

Se utilizara un **monolito modular** con responsabilidades separadas:

```text
React + Three.js
       |
 REST API + WebSocket
       |
NestJS modular
       |
PostgreSQL
```

- El frontend renderiza la simulacion, ejecuta el entrenamiento NEAT y muestra las metricas.
- El backend administra autenticacion, persistencia, salas y carreras multijugador.
- El entrenamiento se ejecuta inicialmente en el navegador.
- El backend solo recibe checkpoints, genomas y metricas; no recibe informacion de cada frame.
- Las carreras multijugador son autoritativas en el servidor para evitar resultados manipulados.
- No se usaran microservicios durante el MVP.

## Tecnologias

### General

- TypeScript
- pnpm como unico gestor de paquetes
- Docker Compose para servicios locales
- Git y CI para ejecutar lint, pruebas y build

### Frontend

- React + Vite
- React Router
- Three.js + React Three Fiber
- `@react-three/drei`
- Rapier mediante `@react-three/rapier`
- Zustand para sesion y estado de interfaz
- TanStack Query para datos HTTP
- React Hook Form + Zod
- Socket.IO Client
- Vitest + Testing Library
- Playwright para pruebas E2E

### Backend

- NestJS
- PostgreSQL
- Prisma ORM
- Passport + JWT
- Argon2 para contrasenas
- `class-validator` + `class-transformer`
- Swagger/OpenAPI
- NestJS WebSockets + Socket.IO
- Helmet, CORS y rate limiting
- Pino para logs
- Jest + Supertest

Redis, BullMQ y almacenamiento S3/MinIO se dejan como mejoras futuras.

## Organizacion del codigo

El backend seguira Clean Architecture por modulos. Los controllers y gateways solo validan solicitudes y ejecutan casos de uso; la logica de negocio no debe estar dentro de ellos.

```text
synapse-backend/src/
  common/
  config/
  infrastructure/
    database/
    logging/
  modules/
    auth/
    users/
    tracks/
    training/
    genomes/
    rooms/
    races/
```

Cada modulo puede dividirse, cuando sea necesario, en:

```text
domain/
application/
infrastructure/
presentation/
```

El frontend se organizara por funcionalidades. La fisica y NEAT seran modulos TypeScript independientes de los componentes JSX.

```text
synapse-frontend/src/
  app/
  components/
  features/
    auth/
    dashboard/
    training/
      neat/
      physics/
      sensors/
      workers/
    multiplayer/
  scenes/
  shared/
```

## Entrenamiento NEAT

### Sensores y controles

Cada auto tendra cinco raycasts orientados aproximadamente a:

```text
-60 grados, -30 grados, 0 grados, +30 grados, +60 grados
```

Las entradas iniciales de la red seran:

- Cinco distancias normalizadas de los raycasts.
- Velocidad longitudinal normalizada.
- Opcionalmente velocidad lateral o angulo respecto al circuito.

Las salidas seran:

- Direccion entre `-1` y `1`.
- Aceleracion/freno entre `-1` y `1`.

### Simulacion

- Usar un timestep fijo, por ejemplo `1/60` segundos.
- Las paredes invisibles tendran colliders fisicos.
- El circuito tendra checkpoints ordenados y una meta.
- Un auto termina al chocar, salir, quedar sin progreso, agotar el tiempo o completar la vuelta.
- El estado que cambia cada frame no debe guardarse en React.
- El calculo evolutivo podra moverse a un Web Worker.

### Fitness

El fitness priorizara el progreso real para evitar autos quietos o dando vueltas cerca del inicio:

```text
fitness =
  progreso en circuito
  + checkpoints completados
  + velocidad media
  - colisiones
  - tiempo sin avanzar
  - retroceso innecesario
```

### Implementacion de NEAT

Se recomienda implementar el nucleo en TypeScript para tener control y valor academico:

- Genomas, nodos y conexiones.
- Numeros de innovacion.
- Evaluacion de redes.
- Mutacion de pesos.
- Agregar nodos y conexiones.
- Crossover.
- Especiacion y distancia de compatibilidad.
- Seleccion y elitismo.
- Semilla aleatoria reproducible.
- Serializacion de genomas y configuracion versionada.

## Persistencia

Entidades principales:

- `User`: cuenta y perfil.
- `RefreshSession`: sesiones renovables y revocables.
- `Track`: definicion y version del circuito.
- `TrainingRun`: configuracion y estado de un entrenamiento.
- `Genome`: genomas destacados o checkpoints.
- `GenerationMetric`: fitness, especies y duracion por generacion.
- `Room`: sala multijugador.
- `Race`: carrera ejecutada.
- `RaceParticipant`: resultado de cada participante.

Guardar:

- Configuracion y semilla del entrenamiento.
- Generacion actual.
- Mejor genoma de cada generacion.
- Checkpoint completo cada 5 o 10 generaciones.
- Metricas agregadas.

No guardar cada posicion, raycast o frame de la simulacion.

## API inicial

```text
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me

GET  /tracks
GET  /tracks/:id
POST /tracks

POST /training-runs
GET  /training-runs
GET  /training-runs/:id
POST /training-runs/:id/checkpoints
GET  /training-runs/:id/checkpoints/latest
GET  /training-runs/:id/metrics
GET  /training-runs/:id/best-genome
```

Swagger documentara la API. El frontend podra generar sus contratos desde OpenAPI para evitar DTO duplicados.

## Autenticacion y seguridad

- Hash de contrasenas con Argon2.
- Access token de corta duracion.
- Refresh token rotatorio en cookie `HttpOnly`, `Secure` y `SameSite`.
- Guardar solo el hash del refresh token.
- Aplicar rate limiting a login y registro.
- Validacion global de DTO.
- CORS limitado al frontend.
- Comprobar en el backend que cada recurso pertenece al usuario autenticado.
- Nunca confiar en posiciones, resultados o identificadores de usuario enviados por el cliente.

## Multijugador

El primer MVP tendra jugadores humanos en salas privadas de 2 a 4 participantes.

Flujo:

1. Un jugador crea una sala y recibe un codigo.
2. Otros jugadores ingresan con ese codigo.
3. El host selecciona el circuito.
4. Los jugadores marcan que estan listos.
5. El servidor inicia la cuenta regresiva.
6. Los clientes envian controles, no posiciones.
7. El servidor simula y publica snapshots.
8. Los clientes interpolan a los jugadores remotos.
9. El servidor valida checkpoints y resultados.

Eventos WebSocket iniciales:

```text
room:create
room:join
room:leave
room:state
player:ready
race:start
race:input
race:snapshot
race:finish
player:disconnected
```

La simulacion del servidor puede ejecutarse a 20 o 30 ticks por segundo y el cliente renderizar a 60 FPS.

## Circuitos

La primera pista se definira mediante datos versionados, sin editor visual:

```text
TrackDefinition
- version
- spawnPoints
- checkpoints
- walls
- finishLine
```

Esto permite reconstruir la misma pista en entrenamiento y multijugador. Una version utilizada por un entrenamiento o una carrera no debe modificarse.

## Pruebas prioritarias

- Mutaciones, crossover, innovaciones y serializacion NEAT.
- Reproducibilidad mediante una semilla.
- Distancias normalizadas de los raycasts.
- Orden y validacion de checkpoints.
- Eliminacion de autos sin progreso.
- Registro, login y rotacion de tokens.
- Permisos sobre entrenamientos y genomas.
- Guardado y recuperacion de checkpoints.
- Creacion, entrada, salida y reconexion a salas.
- Flujo E2E de entrenamiento y carrera.

## Fases de desarrollo

### Fase 1: base tecnica

- Estandarizar pnpm.
- Configurar variables de entorno y Docker Compose.
- Incorporar PostgreSQL, Prisma y Swagger.
- Configurar React Router, proveedores, lint, pruebas y CI.

### Fase 2: autenticacion

- Registro, login, refresh y logout.
- Rutas protegidas.
- Dashboard con Entrenar y Multijugador.

### Fase 3: prototipo 3D

- Circuito sencillo y camara.
- Auto con fisica y controles manuales.
- Raycasts visibles para depuracion.
- Checkpoints y progreso.

### Fase 4: NEAT

- Red, genoma y poblacion.
- Mutaciones, crossover y especies.
- Fitness y evaluacion de generaciones.
- Panel de metricas y prueba del mejor auto.

### Fase 5: persistencia

- Crear, guardar, listar y reanudar entrenamientos.
- Guardar checkpoints, metricas y mejores genomas.

### Fase 6: multijugador

- Salas, lobby y estado preparado.
- Cuenta regresiva.
- Simulacion autoritativa y snapshots.
- Clasificacion y manejo de desconexiones.

### Fase 7: calidad y despliegue

- Pruebas unitarias y E2E.
- Optimizacion y seguridad.
- Logs y manejo de errores.
- Diseno responsive.
- Documentacion y despliegue.

## Alcance del MVP

Incluye:

- Registro e inicio de sesion.
- Un circuito y un modelo de auto.
- Cinco raycasts.
- Poblacion NEAT configurable.
- Entrenamiento local y grafico de fitness.
- Guardado y reanudacion mediante checkpoints.
- Salas privadas para 2 a 4 jugadores.
- Carrera y clasificacion final.

Queda para versiones posteriores:

- Editor de circuitos.
- Matchmaking publico.
- Chat.
- Personalizacion de autos.
- Rankings globales.
- Repeticiones.
- Entrenamiento distribuido.
- Microservicios.

## Orden recomendado

```text
Conduccion manual
-> raycasts
-> checkpoints
-> fitness
-> red neuronal
-> evolucion NEAT
-> persistencia
-> salas
-> carrera multijugador
```

La simulacion manual debe ser estable antes de implementar NEAT, y las reglas de carrera deben estar probadas antes de implementar el multijugador.
