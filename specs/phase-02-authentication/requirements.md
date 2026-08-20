# Fase 2 - Requisitos de autenticacion

## Objetivo

Permitir que una persona cree una cuenta, inicie y cierre sesion, recupere su sesion de forma segura y acceda unicamente a las pantallas protegidas cuando este autenticada.

## Alcance

Incluye registro, login, renovacion, logout, perfil actual y proteccion de rutas. Recuperacion de contrasena, verificacion de correo, OAuth y administracion de usuarios quedan fuera de esta fase.

## Requisitos funcionales

### AUTH-001 - Registro

El visitante debe poder registrarse con nombre de usuario, correo y contrasena.

**Criterios de aceptacion:**

- Correo y nombre de usuario son unicos sin distinguir mayusculas en el correo.
- La contrasena tiene entre 10 y 72 caracteres.
- El backend nunca devuelve ni registra el hash de la contrasena.
- Un registro valido inicia una sesion y devuelve el usuario y un access token.
- Datos duplicados responden HTTP 409 y datos invalidos HTTP 400.

### AUTH-002 - Login

El usuario debe iniciar sesion con correo y contrasena.

**Criterios de aceptacion:**

- Credenciales validas devuelven usuario y access token.
- Credenciales invalidas devuelven un error generico HTTP 401.
- La respuesta establece un refresh token en cookie `HttpOnly`.
- El endpoint tiene limitacion de solicitudes.

### AUTH-003 - Renovacion de sesion

El frontend debe recuperar una sesion sin persistir el access token en almacenamiento web.

**Criterios de aceptacion:**

- `POST /api/auth/refresh` consume la cookie y rota el refresh token.
- El token anterior queda revocado y no puede reutilizarse.
- El nuevo access token permanece solo en memoria del frontend.
- Una cookie ausente, expirada o revocada responde HTTP 401.

### AUTH-004 - Usuario actual

`GET /api/auth/me` debe devolver el usuario asociado a un access token valido.

**Criterios de aceptacion:**

- La ruta exige `Authorization: Bearer <token>`.
- La respuesta nunca contiene datos sensibles.
- Tokens invalidos o expirados responden HTTP 401.

### AUTH-005 - Logout

El usuario debe cerrar la sesion activa.

**Criterios de aceptacion:**

- La sesion de refresh queda revocada.
- La cookie se elimina aunque el token ya no sea valido.
- El frontend limpia inmediatamente su estado en memoria.

### AUTH-006 - Navegacion protegida

El frontend debe separar rutas publicas y privadas.

**Criterios de aceptacion:**

- `/login` y `/register` son publicas.
- `/` y `/dashboard` requieren autenticacion.
- Durante la renovacion inicial se muestra un estado de carga.
- Un visitante es redirigido a login.
- Un usuario autenticado ve el dashboard con las opciones Entrenar y Multijugador.

## Requisitos no funcionales

### AUTH-NFR-001 - Seguridad

- Hash Argon2id para contrasenas y refresh tokens almacenados.
- Secretos JWT de al menos 32 caracteres y diferentes entre si.
- Access token de 15 minutos por defecto.
- Refresh token de 30 dias por defecto.
- Cookies `HttpOnly`, `SameSite=Lax`, path restringido y `Secure` en produccion.
- Respuestas de autenticacion sin enumeracion de cuentas.

### AUTH-NFR-002 - Persistencia

Usuarios y sesiones se almacenan en PostgreSQL mediante una migracion Prisma versionada. Las sesiones pueden revocarse sin eliminar su historial inmediatamente.

### AUTH-NFR-003 - Pruebas

Debe haber pruebas de validacion, registro/login, proteccion de rutas, rotacion/logout y navegacion del frontend.

### AUTH-NFR-004 - Documentacion

Swagger debe documentar contratos y autenticacion Bearer. La spec debe registrar tareas y resultados reales.
