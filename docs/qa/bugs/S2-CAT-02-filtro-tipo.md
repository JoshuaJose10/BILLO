# S2-CAT-02 · Categorías acepta un tipo inválido

- Estado: abierto; tarea de ClickUp pendiente de alta.
- Responsable propuesto: Oscar Alejandro Arias Corona.
- Fecha límite propuesta: 2026-10-29, America/Mexico_City.
- Severidad propuesta: media. Relacionado con HU-18 y bloquea la línea base de HU-28.
- Fuente: `develop` en el commit registrado en [la evidencia](../../postman/ejecucion-sprint2.json).

Precondición: usuario registrado y token válido.
Reproducción: enviar `GET /categorias?tipo=invalido` con
`Authorization: Bearer <token>`.

Esperado: HTTP 400 y `{ "error": { "code": "TIPO_INVALIDO", "message": "..." } }`.
Observado: HTTP 200 y el catálogo completo; el controlador ignora `req.query.tipo`.
`QA-CAT-03` falla en ambas iteraciones: **2 casos y 6 aserciones**.

Validar además los tipos válidos `gasto` y `membresia`, junto con S2-CAT-01,
y repetir la colección completa. No se considera demostrado el filtrado correcto
solo por rechazar `invalido`.

Alta externa pendiente: conservar este ID en la tarea y enlazarla en el reporte.
