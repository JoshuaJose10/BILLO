# [RF1] La ruta documentada /auth/perfil responde 404

- Casos: QA-AUTH-06 y QA-AUTH-07 de Billo API.
- Severidad propuesta: **Media**; existe la alternativa `/auth/profile`, pero los consumidores que usan la ruta acordada no pueden obtener el perfil.
- Estado: Abierto, pendiente de registrar en ClickUp.
- Responsable: Por asignar. Fecha de corrección: Por acordar.
- Fecha de reporte: 2026-10-19.

## Ambiente

Backend `develop`, commit `22757d2` (base completa: ver JSON de ejecución), Windows, Node.js v22.15.0, PostgreSQL local, Newman 6.2.3. HTTP `http://localhost:3000`.

## Precondiciones

Backend y BD activos. La colección registra un usuario e inicia sesión, guardando el JWT en `token` automáticamente.

## Pasos para reproducir

1. Ejecutar la colección Billo API completa en orden.
2. Verificar la petición 09: GET `/auth/profile` con el Bearer token generado devuelve 200 y el usuario correcto.
3. Revisar la petición 10: GET `/auth/perfil` con exactamente el mismo token válido.
4. Revisar la petición 11: GET `/auth/perfil` sin encabezado Authorization.

## Resultado esperado

La petición 10 devuelve 200 JSON con el perfil del usuario autenticado. La petición 11 devuelve 401 JSON con `NO_AUTORIZADO`, según [contrato de perfil](../../api-contrato.md).

## Resultado obtenido

Ambas peticiones a `/auth/perfil` responden 404 y HTML `Cannot GET /auth/perfil`. En `backend/src/routes/auth.routes.js` únicamente está registrada `/profile`. La petición adicional 09 permite comprobar que el JWT funciona y que no es un fallo de login o de copiado del token.

## Evidencia

[Ejecución sanitizada](../../postman/ejecucion-auth-2026-10-19.json), peticiones 09–11 de ambas iteraciones. La colección conserva la ruta del contrato y reporta sus fallas; no se cambia manualmente para ocultarlas.

## Reprueba

Pendiente. Repetir la misma colección tras el cambio; registrar commit, fecha, ejecutor y evidencia.
