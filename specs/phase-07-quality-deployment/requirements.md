# Fase 7 - Requisitos de calidad y despliegue

## Objetivo

Preparar Synapse Racing para una entrega reproducible, observable y segura mediante verificaciones automatizadas, healthchecks, contenedores y documentacion operativa.

## Requisitos funcionales

### OPS-001 - Healthchecks

- `GET /api/health/live` confirma que el proceso responde.
- `GET /api/health/ready` comprueba conectividad PostgreSQL.
- Readiness responde 503 cuando la base no esta disponible.
- Los contenedores usan readiness para determinar salud.

### OPS-002 - Ciclo de vida

- NestJS atiende senales de apagado y cierra Prisma, HTTP y timers.
- El gateway multijugador elimina su intervalo al destruir el modulo.
- Los contenedores tienen politica de reinicio y periodo de gracia.

### OPS-003 - Configuracion de produccion

- Secretos JWT y credenciales se inyectan por entorno.
- Swagger no se expone en produccion.
- CORS usa el origen configurado.
- Cookies permanecen `Secure` en produccion.
- Payload JSON admite snapshots hasta 2 MB, sin quedar ilimitado.

### OPS-004 - Frontend resiliente

- Un error de render muestra una pantalla recuperable en lugar de una pagina vacia.
- La API acepta URL absoluta en desarrollo y `/api` relativo en produccion.
- Socket.IO usa el origen actual cuando la API es relativa.
- Rutas SPA funcionan al recargar directamente.

### OPS-005 - Contenedores

- Backend multi-stage con dependencias productivas, Prisma generado y usuario no root.
- Frontend multi-stage servido por Nginx.
- Nginx comprime, cachea assets y proxifica `/api` y `/socket.io`.
- Existen `.dockerignore` para ambos proyectos.

### OPS-006 - Orquestacion

- Compose de produccion contiene PostgreSQL, backend y frontend.
- Dependencias usan healthchecks.
- PostgreSQL usa volumen persistente.
- Variables obligatorias fallan durante interpolacion si no se proporcionan.

### OPS-007 - Automatizacion

- CI mantiene instalacion congelada, lint, pruebas y build.
- CI construye la imagen Docker de cada repositorio.
- Migraciones se aplican antes de iniciar backend en produccion.

## Requisitos no funcionales

### OPS-NFR-001 - Rendimiento

- Multijugador visual no descarga Rapier si solo necesita meshes.
- Assets con hash reciben cache inmutable.
- HTML no recibe cache persistente.
- El laboratorio 3D continua cargandose de forma diferida.

### OPS-NFR-002 - Seguridad

- Contenedores de aplicacion no ejecutan como root.
- Nginx agrega cabeceras basicas de seguridad.
- Logs redactan authorization y cookies.
- No se incorporan secretos en imagen, repositorio o logs.

### OPS-NFR-003 - Evidencia

- Lint sin advertencias.
- Todas las pruebas y builds pasan.
- `docker compose config` valida la orquestacion.
- Las imagenes Docker se construyen localmente o queda documentado cualquier bloqueo ambiental.

## Fuera de alcance

- Provisionamiento cloud especifico.
- TLS dentro del contenedor Nginx; se espera terminacion TLS externa.
- Kubernetes, autoscaling y Redis.
- Sentry u otro SaaS que requiera credenciales reales.
