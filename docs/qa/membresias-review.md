# Review QA — Membresías (RF5)

Fecha: 2026-11-01. Rama revisada: `feature/membresias`. Commit: `70ecc7e`.

**Resultado: no se acepta por el momento.**

Se ejecutaron 43 verificaciones contra la API Express y PostgreSQL reales: 42 correctas y 1 fallida. La base temporal fue eliminada al terminar. No se modificó la implementación.

| Criterio | Resultado |
| --- | --- |
| CP-RF5-01: registro y consulta | Cumple en API |
| CP-RF5-02: edición y eliminación | Cumple en API |
| CP-RF5-03: rechazo de nombre vacío | Cumple en API; 400 `NOMBRE_INVALIDO` |
| CP-RF5-04: rechazo de costo `abc` | Cumple en API; 400 `COSTO_INVALIDO` |
| Frecuencia `semanal` y servicio inexistente | Cumple; 400 con el código correspondiente |
| Fecha válida y costo positivo de máximo dos decimales | Cumple en los casos ejecutados |
| Nombre y costo tomados del catálogo cuando se omiten | Cumple en POST y PUT |
| Lista ordenada por fecha y cálculo de `dias_para_cobro` | Cumple |
| Aislamiento entre usuarios A y B | Los datos quedan protegidos; falla el código de respuesta en el caso descrito abajo |
| Cuatro endpoints y códigos del contrato | Cumplimiento parcial por el fallo de PUT |
| Ejemplos en el PR | Pendiente: no se revisó el PR remoto |

## Hallazgo que impide aceptar

En `backend/src/controllers/membresias.controller.js:272`, PUT valida el cuerpo antes de comprobar la pertenencia de la membresía.

Reproducción:

1. Crear una membresía con el usuario A.
2. Con el token de B, enviar `PUT /membresias/<id_de_A>` con este cuerpo (ajustar la fecha si corresponde):

```json
{"nombre":"","costo":199,"frecuencia":"mensual","fecha_cobro":"2026-11-01"}
```

Esperado según la tarea: **404 `MEMBRESIA_NO_ENCONTRADA`**, por tratarse de una membresía de otro usuario.

Obtenido: **400 `NOMBRE_INVALIDO`**. El registro de A no se altera. Con un cuerpo válido, PUT sí devuelve el 404 esperado; DELETE también responde correctamente.

Corrección sugerida: comprobar existencia y pertenencia antes de validar el cuerpo, conservando el filtro por usuario en la actualización. Repetir la prueba tras corregirlo.

## Alcance y evidencia

Los CP-RF5-01 a CP-RF5-04 del plan incluyen interacción con pantallas y confirmación de eliminación. Aquí se verificó su comportamiento equivalente en API; la ejecución completa en la app móvil queda pendiente.

Reproducir desde `backend` con `node qa/membresias.cjs`. Requiere PostgreSQL y permiso para crear bases temporales con la conexión de `backend/.env`. El proceso devuelve código 1 mientras exista el fallo.

Detalle: [membresias-resultados.json](membresias-resultados.json).

## Review sencillo para compartir

No se acepta por el momento. El CRUD, las validaciones y los valores del catálogo funcionan, y la lista se ordena correctamente. Sin embargo, al editar una membresía ajena con datos inválidos se devuelve 400 en lugar del 404 `MEMBRESIA_NO_ENCONTRADA` exigido. Se requiere corregir ese caso y repetir QA. Resultado de API: 42/43 verificaciones correctas; la revisión de pantallas y de los ejemplos del PR queda pendiente.
