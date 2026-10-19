# [RF1] El registro devuelve el usuario sin la envoltura acordada

- Caso: CP-RF1-01 (API), petición 01 de Billo API.
- Severidad propuesta: **Media**; la cuenta se crea, pero los consumidores que esperan `body.usuario` reciben un formato diferente.
- Estado: Abierto, pendiente de registrar en ClickUp.
- Responsable: Por asignar. Fecha de corrección: Por acordar.
- Fecha de reporte: 2026-10-19.

## Ambiente

Backend `develop`, commit `22757d2` (base completa: ver JSON de ejecución), Windows, Node.js v22.15.0, PostgreSQL local, Newman 6.2.3. HTTP `http://localhost:3000`.

## Precondiciones

Backend y BD activos. Ejecutar la colección completa para generar un correo QA único; no reutilizar un correo preexistente.

## Pasos para reproducir

1. Importar `docs/postman/billo-api.postman_collection.json`.
2. Ejecutar la petición 01 desde el Runner; genera nombre, correo válido y contraseña de más de 8 caracteres automáticamente.
3. Inspeccionar la respuesta del POST `/auth/register` y la aserción `CONTRATO: registro devuelve { usuario: {...} }`.

## Resultado esperado

HTTP 201 con `{"usuario":{"id":7,"nombre":"QA Postman","email":"<correo QA generado>"}}`, según [contrato de registro](../../api-contrato.md). El ID ilustrativo se sustituye por el creado.

## Resultado obtenido

HTTP 201 con el usuario directamente: `{"id":7,"nombre":"QA Postman","email":"<correo QA generado>"}`. No existe la propiedad `usuario`. La comprobación funcional de creación sí pasa.

## Evidencia

[Ejecución sanitizada](../../postman/ejecucion-auth-2026-10-19.json), petición 01 en ambas iteraciones. Los IDs y las respuestas exactas se conservan ahí.

## Reprueba

Pendiente. Repetir la misma colección tras el cambio; registrar commit, fecha, ejecutor y evidencia.
