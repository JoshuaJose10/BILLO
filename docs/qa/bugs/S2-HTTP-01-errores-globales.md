# S2-HTTP-01 · Errores globales devuelven HTML

- Estado: abierto; tarea de ClickUp pendiente de alta.
- Responsable propuesto: Oscar Alejandro Arias Corona.
- Fecha límite propuesta: 2026-10-29, America/Mexico_City.
- Severidad propuesta: media. Regresión pendiente de HU-18; bloquea la línea base de HU-28.
- Fuente: `develop` en el commit registrado en [la evidencia](../../postman/ejecucion-sprint2.json).

Reproducción, sin token:

1. Enviar `POST /auth/register`, `Content-Type: application/json`, cuerpo literal `{"nombre":`.
2. Enviar `GET /qa-ruta-inexistente`.

Esperado: 400 `JSON_INVALIDO` y 404 `RUTA_NO_ENCONTRADA`, respectivamente;
ambos con `Content-Type: application/json` y `{ error: { code, message } }`.

Observado: estados 400 y 404 correctos, pero `text/html; charset=utf-8` y páginas
HTML de Express. El 400 incluye una traza del servidor. `src/app.js` no instala
un manejador JSON para rutas inexistentes ni para errores del parser.
`QA-HTTP-JSON` y `QA-HTTP-RUTA` fallan en ambas iteraciones:
**4 casos y 12 aserciones**. Se agrupan en un registro por el manejo global faltante.

Validar los dos errores y repetir la colección completa. Las respuestas no deben
exponer trazas internas; conservar los códigos documentados de v1.1.

Alta externa pendiente: conservar este ID en la tarea y enlazarla en el reporte.
