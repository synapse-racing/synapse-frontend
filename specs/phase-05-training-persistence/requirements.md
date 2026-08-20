# Fase 5 - Requisitos de persistencia de entrenamientos

## Objetivo

Guardar el estado completo de un entrenamiento NEAT, sus metricas y mejor genoma para poder cerrar el navegador y continuar posteriormente desde la misma generacion.

## Alcance

Incluye CRUD basico de entrenamientos propios, checkpoints por generacion, metricas, autosave y reanudacion. No incluye almacenamiento de frames, repeticiones, archivos externos ni entrenamiento en servidor.

## Requisitos funcionales

### PERSIST-001 - Crear entrenamiento

- Un usuario autenticado puede crear un entrenamiento con nombre y semilla.
- La configuracion NEAT queda almacenada con el entrenamiento.
- El entrenamiento comienza en estado `PAUSED` hasta iniciar la simulacion.

### PERSIST-002 - Listar y consultar

- El usuario puede listar solo sus entrenamientos.
- Cada elemento muestra nombre, estado, generacion, mejor fitness y fecha de actualizacion.
- Puede consultar el detalle de un entrenamiento propio.
- Acceder a un entrenamiento ajeno responde 404 para no revelar su existencia.

### PERSIST-003 - Checkpoint completo

Cada checkpoint debe guardar:

- Version del formato.
- Configuracion y semilla.
- Generacion actual.
- Poblacion completa con nodos y conexiones.
- Estado interno del PRNG.
- Contadores y mapas del `InnovationTracker`.
- Siguiente identificador de genoma.
- Mejor genoma conocido.

### PERSIST-004 - Metricas

- Cada generacion guarda mejor fitness, promedio, cantidad de especies y duracion.
- Solo existe una metrica por entrenamiento y generacion.
- Las metricas se consultan ordenadas por generacion.

### PERSIST-005 - Autosave

- Al terminar cada generacion el frontend guarda snapshot y metricas.
- La interfaz muestra `guardando`, `guardado` o `error`.
- Un fallo de red no detiene la evolucion local.
- No se guardan posiciones, raycasts ni frames.

### PERSIST-006 - Reanudar

- El usuario selecciona un entrenamiento desde el laboratorio.
- El frontend obtiene el checkpoint mas reciente.
- El motor se reconstruye exactamente desde el snapshot.
- La siguiente evolucion conserva reproducibilidad respecto al motor original.
- Si todavia no existe checkpoint, se reconstruye desde semilla y configuracion.

### PERSIST-007 - Estado y eliminacion

- Pausar, iniciar o reanudar actualiza el estado remoto.
- El usuario puede eliminar un entrenamiento propio y sus datos asociados.
- La eliminacion requiere una accion explicita en la interfaz.

## Requisitos no funcionales

### PERSIST-NFR-001 - Seguridad

- Todos los endpoints requieren Bearer JWT.
- El `userId` se obtiene del token, nunca del body.
- Todas las consultas filtran por propietario.
- DTO y snapshot tienen validacion de version y limites basicos.

### PERSIST-NFR-002 - Integridad

- Checkpoint, metrica y resumen del entrenamiento se actualizan en una transaccion.
- Restricciones unicas evitan duplicados por generacion.
- El mejor fitness solo aumenta.

### PERSIST-NFR-003 - Compatibilidad

- El snapshot incluye `version: 1`.
- Una version desconocida falla de forma explicita.
- Los JSON almacenados no dependen de clases ni prototipos.

### PERSIST-NFR-004 - Pruebas

- Round-trip de snapshot y siguiente generacion determinista.
- API E2E de creacion, checkpoint, listado, metricas y propiedad.
- Pruebas frontend de contratos o seleccion de entrenamiento sin montar WebGL.
