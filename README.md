# Synapse Racing - Frontend

Frontend React de la plataforma de entrenamiento NEAT y carreras multijugador.

## Requisitos

- Node.js 24 o superior.
- Corepack habilitado.
- Backend ejecutandose en `http://localhost:3000`.

## Instalacion

```bash
corepack enable
pnpm install
```

Crea el entorno local a partir de `.env.example` y ajusta la URL si el backend utiliza otro puerto:

```text
VITE_API_URL=http://localhost:3000/api
```

La imagen de produccion usa `/api`, servido bajo el mismo origen por Nginx. El contenedor incluye fallback para rutas SPA y proxy WebSocket.

## Comandos

```bash
pnpm dev
pnpm lint
pnpm test
pnpm build
pnpm preview
```

## Estructura inicial

```text
src/
  app/       # Providers globales
  features/  # Autenticacion y futuras funcionalidades
  pages/     # Paginas enrutables
  shared/    # Configuracion y utilidades compartidas
  test/      # Setup de pruebas
```

El plan del producto esta en [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) y el avance spec-driven en [`specs/README.md`](./specs/README.md).

La aplicacion dispone actualmente de registro, login, recuperacion de sesion, logout y dashboard protegido. El access token se conserva solo en memoria y el refresh token se administra mediante una cookie `HttpOnly`.

El laboratorio `/training` incluye un circuito 3D, conduccion manual con WASD o flechas, fisica Rapier, camara de seguimiento, cinco raycasts, checkpoints y telemetria. Pulsa `R` para reiniciar el prototipo.

El entrenamiento `/training/neat` ejecuta una poblacion de 24 autos con redes feed-forward, innovaciones, mutaciones estructurales, crossover, especiacion y elitismo. El panel permite iniciar, pausar y reiniciar de forma reproducible con la misma semilla.

Los entrenamientos NEAT se guardan en PostgreSQL al terminar cada generacion. El selector permite crear, cargar y eliminar ejecuciones; los snapshots versionados restauran poblacion, PRNG e innovaciones para continuar de forma determinista.

El modo `/multiplayer` ofrece salas privadas de 2 a 4 jugadores mediante Socket.IO. NestJS simula la carrera a 20 Hz, publica snapshots a 10 Hz y valida checkpoints y resultados; React interpola los autos dentro de la pista 3D.
