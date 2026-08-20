# Fase 1 - Requisitos de la base tecnica

## Objetivo

Preparar una base reproducible para desarrollar el frontend React y el backend NestJS, con configuracion, persistencia, documentacion de API, calidad automatizada y un flujo local claro.

## Alcance

Esta fase no implementa autenticacion, entrenamiento, fisica ni multijugador. Solo entrega la infraestructura tecnica sobre la que se construiran esas funciones.

## Requisitos funcionales

### FND-001 - Estado de salud del backend

El backend debe exponer un endpoint publico `GET /api/health` que responda con estado, nombre del servicio y entorno de ejecucion.

**Criterios de aceptacion:**

- Responde con HTTP 200.
- La respuesta es JSON y no texto plano.
- Existe una prueba unitaria y una prueba E2E del endpoint.

### FND-002 - Configuracion por entorno

El backend debe cargar y validar su configuracion desde variables de entorno.

**Criterios de aceptacion:**

- Existe un archivo `.env.example` sin secretos reales.
- El arranque falla con un mensaje claro si falta una variable obligatoria.
- Puerto, entorno, origen CORS y URL de PostgreSQL son configurables.

### FND-003 - Documentacion de API

El backend debe publicar una especificacion OpenAPI y una interfaz Swagger en desarrollo.

**Criterios de aceptacion:**

- Swagger esta disponible bajo `/api/docs`.
- El endpoint de salud aparece documentado.

### FND-004 - Persistencia preparada

El proyecto debe incluir PostgreSQL para desarrollo local y Prisma como acceso a datos.

**Criterios de aceptacion:**

- Existe una configuracion Docker Compose para PostgreSQL.
- Prisma puede generar su cliente desde un esquema valido.
- Existe un modulo global de base de datos reutilizable por los modulos futuros.

### FND-005 - Base de navegacion del frontend

El frontend debe disponer de enrutamiento, proveedor de consultas HTTP y una pantalla base de estado del proyecto.

**Criterios de aceptacion:**

- React Router administra la ruta inicial y una ruta no encontrada.
- TanStack Query esta configurado en un proveedor de aplicacion.
- La URL del backend se obtiene desde una variable de entorno validada.
- Existe una prueba de renderizado de la aplicacion.

## Requisitos no funcionales

### FND-NFR-001 - Gestor de paquetes

Ambos repositorios deben declarar y utilizar la misma version de pnpm mediante Corepack. No deben mantenerse lockfiles de npm.

### FND-NFR-002 - Calidad automatizada

Frontend y backend deben poder ejecutar comandos no interactivos de lint, pruebas y build. GitHub Actions debe ejecutar esas comprobaciones en cada push y pull request.

### FND-NFR-003 - Seguridad base

El backend debe configurar Helmet, CORS restringido, validacion global de DTO y un prefijo global `/api`.

### FND-NFR-004 - Observabilidad base

El backend debe producir logs estructurados y evitar logs de depuracion manuales en el codigo de aplicacion.

### FND-NFR-005 - Documentacion reproducible

Los README deben explicar requisitos, instalacion, variables, ejecucion y verificaciones sin depender de conocimiento externo.

## Restricciones conocidas

- El workspace contiene dos repositorios Git separados: `synapse-frontend` y `synapse-backend`.
- Docker no esta instalado actualmente en la maquina de desarrollo. La configuracion se podra validar estaticamente, pero el arranque real de PostgreSQL quedara bloqueado hasta instalar Docker Desktop o proporcionar otra instancia PostgreSQL.
