# HU68-BUG-01 — El JWT conserva acceso después de eliminar la cuenta

- Caso(s): reutilización del token tras eliminar la cuenta; acceso al catálogo y escritura como administrador.
- Historia / tarea: HU-68 — Eliminar la cuenta y todos los datos.
- Severidad propuesta: **Alta**; una cuenta eliminada conserva acceso autenticado y, si era administradora, permisos para modificar el catálogo compartido.
- Estado: Abierto; reproducido contra la API y PostgreSQL temporal. Alta en ClickUp pendiente.
- Responsable: Por asignar.
- Fecha de reporte: 2026-11-12, America/Mexico_City.
- Fecha de corrección: Por acordar.

## Ambiente

- Rama: `feature/eliminar-cuenta`, commit `370ef0b`.
- Windows, Node.js v22.15.0, Express real y Supertest, PostgreSQL temporal con migraciones 001 a 016.
- JWT de la fixture con vencimiento de una hora. La configuración del backend usa siete días por defecto si no se define `JWT_EXPIRES_IN`.
- Prueba aislada mediante las helpers de `backend/test/helpers/`; la base temporal se eliminó al terminar.

## Precondiciones

Usar un ambiente de QA y una cuenta descartable con rol `admin`, creada o promovida mediante el mecanismo de administración del proyecto. Tener una segunda cuenta activa para verificar que no se afecta a otros usuarios. Conservar el JWT de la cuenta descartable en un cliente HTTP antes de eliminarla; no incluir su valor ni la contraseña en las evidencias.

## Pasos para reproducir

1. Iniciar sesión con la cuenta administradora mediante `POST /auth/login` y conservar el JWT devuelto.
2. Enviar `DELETE /auth/cuenta` con ese JWT en `Authorization: Bearer <JWT_QA>` y cuerpo `{ "password": "<CONTRASEÑA_QA>" }`.
3. Comprobar que responde `200 { "eliminado": true }` y que la fila del usuario ya no existe en `usuarios`.
4. Reutilizar exactamente el JWT anterior en `GET /catalogo`.
5. Reutilizarlo en `POST /catalogo`, con cuerpo `{ "nombre": "QA HU68 BUG 01", "costo_sugerido": 100 }`.

Los valores entre `<...>` son marcadores que deben sustituirse localmente. Ejecutar la prueba en una base descartable; el paso 5 modifica el catálogo de ese ambiente.

## Resultado esperado

Una vez eliminada la cuenta, sus JWT deben ser rechazados en las rutas protegidas con `401 NO_AUTORIZADO`, siguiendo el [formato de errores del contrato](../../api-contrato.md). La escritura en el catálogo no debe ejecutarse. Las sesiones de otras cuentas deben seguir funcionando.

## Resultado obtenido

- Eliminación: `200 { "eliminado": true }`; cero filas para el usuario eliminado.
- Lectura del catálogo con el JWT anterior: `200`.
- Creación de un servicio con el JWT administrador anterior: `201`.

Cerrar la sesión en el móvil solo elimina la copia local del token. El mismo JWT conservado en otro cliente sigue siendo aceptado mientras no expire.

## Evidencia

- [Resultado sanitizado de la reproducción](../hu68-evidencias/HU68-BUG-01.json), ejecutada sobre `370ef0b` el 2026-11-12. No contiene contraseñas, JWT ni credenciales de conexión.
- [Middleware de autenticación](../../../backend/src/middlewares/auth.middleware.js): verifica firma y vencimiento, pero no comprueba que el usuario siga existiendo.
- [Middleware de administrador](../../../backend/src/middlewares/admin.middleware.js): acepta el rol almacenado en el JWT.
- [Rutas del catálogo](../../../backend/src/routes/catalogo.routes.js): las operaciones de escritura dependen de esos dos middleware.

## Corrección sugerida y criterios de cierre

Rechazar los JWT de usuarios eliminados en la autenticación compartida, comprobando la existencia del usuario o mediante un mecanismo equivalente de revocación. Verificarlo tanto en rutas de lectura como de escritura, incluyendo permisos de administrador. Agregar una prueba de regresión que elimine la cuenta, reutilice sus tokens y compruebe `401` sin nuevas modificaciones en la base; mantener operativa la cuenta de control.

## Reprueba

- Commit corregido: Pendiente.
- Fecha y quién probó: Pendiente.
- Resultado: Pendiente.
- Evidencia: Pendiente.
