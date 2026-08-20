# Fase 1 - Diseno tecnico

## Decisiones

### Repositorios independientes

Se mantienen frontend y backend como repositorios hermanos. Cada uno conserva sus dependencias, CI y ciclo de despliegue. La documentacion global y las specs viven inicialmente en `synapse-frontend/specs` junto al plan del producto.

### Gestion de paquetes

Los dos `package.json` declararan una version fija de pnpm mediante `packageManager`. Corepack resolvera esa version, evitando exigir una instalacion global y reduciendo diferencias entre desarrollo y CI.

### Frontend

La composicion inicial sera:

```text
main.tsx
  -> AppProviders
      -> QueryClientProvider
      -> RouterProvider
          -> rutas y paginas
```

La estructura base sera:

```text
src/
  app/
    providers.tsx
    router.tsx
  pages/
  shared/
    config/
  test/
```

No se agregara estado global hasta que exista un caso de uso que lo necesite.

### Backend

El arranque global configurara:

- Prefijo `/api`.
- `ValidationPipe` con transformacion, whitelist y rechazo de propiedades desconocidas.
- Helmet.
- CORS con un origen configurable.
- Swagger bajo `/api/docs`.
- Logger estructurado Pino.

La configuracion se validara al cargar `ConfigModule`; el resto de la aplicacion consumira valores tipados a traves de `ConfigService`.

### PostgreSQL y Prisma

Docker Compose levantara una sola instancia PostgreSQL con volumen persistente y healthcheck. Prisma se encapsulara en un `DatabaseModule` global y un `PrismaService` responsable de abrir y cerrar la conexion.

La Fase 1 solo crea el esquema y el cliente. Las tablas del dominio se agregaran en sus respectivas fases para evitar disenar entidades antes de especificar sus reglas.

### Integracion continua

Cada repositorio tendra un workflow independiente con Node y pnpm fijados. La secuencia sera:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
```

El backend tambien generara Prisma antes de compilar cuando sea necesario.

## Contrato del endpoint de salud

```json
{
  "status": "ok",
  "service": "synapse-backend",
  "environment": "development"
}
```

El endpoint comprueba que el proceso HTTP esta operativo. La comprobacion profunda de PostgreSQL se agregara cuando una funcionalidad dependa de la base de datos.

## Variables de entorno

### Backend

```text
NODE_ENV
PORT
FRONTEND_URL
DATABASE_URL
```

### Frontend

```text
VITE_API_URL
```

## Verificacion

- Generacion correcta del cliente Prisma.
- Lint, pruebas y build del frontend.
- Lint, pruebas unitarias, pruebas E2E y build del backend.
- Validacion de Docker Compose cuando Docker este disponible.
