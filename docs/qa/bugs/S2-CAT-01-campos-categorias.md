# S2-CAT-01 · Categorías sin los campos del contrato v1.1

- Estado: abierto; tarea de ClickUp pendiente de alta.
- Responsable propuesto: Oscar Alejandro Arias Corona.
- Fecha límite propuesta: 2026-10-29, America/Mexico_City.
- Severidad propuesta: media. Relacionado con HU-18 y bloquea la línea base de HU-28.
- Fuente: `develop` en el commit registrado en [la evidencia](../../postman/ejecucion-sprint2.json).

Precondición: usuario registrado, token válido y migraciones completas.
Reproducción: enviar `GET /categorias`, después `GET /categorias?tipo=gasto`,
con `Authorization: Bearer <token>`.

Esperado: 200 y cada elemento con `id`, `nombre`, `tipo` y `es_predefinida`;
el filtro devuelve solo `tipo=gasto`.

Observado: 200 con elementos como `{ "id": 1, "nombre": "Entretenimiento" }`.
Faltan `tipo` y `es_predefinida`; no se puede comprobar el filtrado con la respuesta.
`QA-CAT-01` y `QA-CAT-02` fallan en ambas iteraciones: **4 casos y 4 aserciones**.
La consulta actual de `backend/src/controllers/categorias.controller.js` selecciona
solo `id, nombre`.

Validar la corrección ejecutando la colección completa con `npm run qa:baseline`.
Alta externa pendiente: conservar este ID en la tarea y enlazarla en el reporte.
