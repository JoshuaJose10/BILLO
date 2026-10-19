# [RF1] Los errores usan code/message en lugar de codigo/mensaje

- Casos: CP-RF1-03, CP-RF1-04 (API) y validaciones negativas de autenticación.
- Severidad propuesta: **Media**; los rechazos tienen los HTTP y códigos funcionales esperados, pero el formato no coincide con el contrato.
- Estado: Abierto, pendiente de registrar en ClickUp.
- Responsable: Por asignar. Fecha de corrección: Por acordar.
- Fecha de reporte: 2026-10-19.

## Ambiente

Backend `develop`, commit `22757d2` (base completa: ver JSON de ejecución), Windows, Node.js v22.15.0, PostgreSQL local, Newman 6.2.3. HTTP `http://localhost:3000`.

## Precondiciones

Backend y BD activos; ejecutar la colección completa en orden para preparar un usuario QA sin editar datos manualmente.

## Pasos para reproducir

1. Ejecutar la petición 01 de la colección Billo API para crear la cuenta.
2. Ejecutar la petición 02, que repite automáticamente el mismo nombre, correo y contraseña válidos en POST `/auth/register`.
3. Revisar las claves de `error` y la aserción `CONTRATO: error.codigo y error.mensaje`.
4. Como segunda reproducción, ejecutar la petición 07: POST `/auth/login` con el correo creado y contraseña `xxxx`.

## Resultado esperado

Duplicado: 409 con `{"error":{"codigo":"EMAIL_DUPLICADO","mensaje":"El correo ya está registrado"}}`. Login incorrecto: 401 con las mismas claves y código `CREDENCIALES_INVALIDAS`. Referencia: [formato estándar de errores](../../api-contrato.md).

## Resultado obtenido

Duplicado: 409 con `{"error":{"code":"EMAIL_DUPLICADO","message":"El correo ya está registrado"}}`. Login incorrecto: 401 con `{"error":{"code":"CREDENCIALES_INVALIDAS","message":"Correo o contraseña incorrectos"}}`.

## Evidencia

[Ejecución sanitizada](../../postman/ejecucion-auth-2026-10-19.json), peticiones 02–05, 07–08. Se registra un solo defecto de formato compartido, sin duplicar reportes por cada petición.

## Reprueba

Pendiente. Repetir la misma colección tras el cambio; registrar commit, fecha, ejecutor y evidencia.
