# Billo API — colección de QA

Archivo importable: [billo-api.postman_collection.json](billo-api.postman_collection.json), formato Postman Collection v2.1. Nombre de la colección: **Billo API**.

## Preparar y ejecutar

Requisitos: Node.js y dependencias del backend, PostgreSQL con las migraciones de HU-01 aplicadas, `backend/.env` configurado y autenticación de HU-02 disponible. Ambas dependencias ya aparecen fusionadas en `develop` al revisar el commit `22757d2` el 2026-10-19.

1. Usar una BD de desarrollo/QA y levantar el backend desde `backend` con `npm start`. Comprobar `GET http://localhost:3000/health`.
2. En Postman Desktop, importar el JSON. Si se usa Postman web, usar un agente local que pueda alcanzar localhost.
3. Seleccionar **sin ambiente** y ejecutar la colección completa en el Runner, con las once peticiones seleccionadas en su orden original. No es necesario crear usuarios, copiar tokens ni editar cuerpos. Para otro servidor, cambiar únicamente la variable de colección `baseUrl` antes de empezar.
4. Revisar tanto las peticiones como sus pruebas. Para verificar repetibilidad, ejecutar dos iteraciones: cada una genera credenciales QA distintas.

Alternativa desde la raíz del repositorio, con el backend ya encendido:

```powershell
npx --yes newman@6.2.3 run docs/postman/billo-api.postman_collection.json --iteration-count 2
```

No se modifica `package.json` ni se requiere agregar Newman como dependencia del producto. Un código de salida 1 indica aserciones fallidas o errores de ejecución; leer el resultado para distinguirlos. **Ejecutar sin edición manual no significa que la API ya cumpla todas las aserciones.**

## Variables y datos de prueba

| Variable | Valor exportado / uso |
|---|---|
| `baseUrl` | `http://localhost:3000`, sin diagonal final |
| `token` | Vacío; el login exitoso lo guarda automáticamente y la autorización Bearer lo reutiliza |
| `qaEmail` | Vacío; el primer registro genera `qa.postman.<guid>@example.test` |
| `qaOtherEmail` | Vacío; correo distinto que debe seguir sin registrar tras las peticiones inválidas |
| `qaPassword` | Vacío; contraseña de prueba generada al empezar cada iteración |
| `qaNombre` | Vacío; se inicializa con `QA Postman` |
| `qaUserId` | Vacío; captura el ID del registro para comparar login y perfil |
| `qaCredentialError` | Vacío; permite comparar el error de contraseña incorrecta con el de correo inexistente |

La petición 01 reinicializa estos valores por iteración. La petición 06 utiliza `pm.collectionVariables.set("token", pm.response.json().token)` solo ante login exitoso. Las peticiones 07 y 08 no reemplazan el token válido con respuestas fallidas. No hay variables globales ni entorno externo obligatorio. Ejecutar una petición suelta antes de la 01 no prepara los datos: usar el Runner completo.

Cada iteración registra una cuenta QA nueva y no toca usuarios preexistentes. La API no ofrece borrar cuentas; los registros QA quedan en la BD utilizada y deben gestionarse con el procedimiento de limpieza del equipo. No ejecutar contra producción. No publicar exportaciones posteriores al Runner con JWT, contraseñas generadas ni variables de sesión; el JSON versionado conserva esos campos vacíos. La evidencia incluida está sanitizada.

## Peticiones y trazabilidad

| Orden | Caso | Petición | Esperado |
|---|---|---|---|
| 01 | CP-RF1-01, parte API | POST `/auth/register`, datos nuevos | 201, usuario creado |
| 02 | CP-RF1-03, parte API | POST `/auth/register`, mismo correo | 409, EMAIL_DUPLICADO |
| 03 | QA-AUTH-01 | POST `/auth/register`, correo sin arroba | 400, EMAIL_INVALIDO |
| 04 | QA-AUTH-02 | POST `/auth/register`, contraseña de 7 caracteres | 400, PASSWORD_MUY_CORTA |
| 05 | QA-AUTH-03 | POST `/auth/register`, nombre con espacios | 400, NOMBRE_REQUERIDO; validación adicional de la implementación |
| 06 | CP-RF1-02, parte API | POST `/auth/login`, datos del registro | 200, JWT guardado y mismo usuario |
| 07 | CP-RF1-04, parte API | POST `/auth/login`, contraseña `xxxx` | 401, CREDENCIALES_INVALIDAS, sin token nuevo |
| 08 | QA-AUTH-04 | POST `/auth/login`, correo inexistente | 401 e igual error al caso 07, sin revelar existencia |
| 09 | QA-AUTH-05 | GET `/auth/profile`, token automático | 200, perfil del usuario QA; comprobación adicional de la ruta actualmente implementada |
| 10 | QA-AUTH-06 | GET `/auth/perfil`, token automático | 200 según el contrato |
| 11 | QA-AUTH-07 | GET `/auth/perfil`, sin token | 401, NO_AUTORIZADO según el contrato |

Los IDs `QA-AUTH-*` son comprobaciones adicionales de esta colección, no reemplazos de los casos `CP-RF*` del plan. Las pruebas de respuesta JSON y de ausencia de contraseñas/hashes aplican a todas las peticiones. Las aserciones con prefijo **CONTRATO** verifican las claves documentadas en [api-contrato.md](../api-contrato.md). Las comprobaciones funcionales leen tanto `codigo/mensaje` como `code/message` para continuar el flujo, pero una prueba separada exige el formato acordado: la compatibilidad no oculta el defecto.

La colección valida API de autenticación. Las pantallas, el almacenamiento de sesión, los dispositivos Android y RF2–RF8 se verifican mediante [checklist-pruebas.md](../checklist-pruebas.md) y el plan. No marcar los casos completos de UI como aprobados por un resultado de API.

## Evidencia y defectos

Validación del 2026-10-19 con Newman 6.2.3: **2 iteraciones, 22 peticiones, 110 aserciones: 78 aprobadas y 32 fallidas; 0 errores de transporte y 0 errores de scripts**. El registro produjo usuarios distintos en cada iteración y el perfil implementado confirmó el token automático en ambas. Las 32 fallas son aserciones repetidas asociadas a los tres defectos siguientes, no 32 bugs distintos. Las ejecuciones exploratorias y finales crearon cuatro cuentas QA; no se borraron usuarios.

Ver [ejecución sanitizada](ejecucion-auth-2026-10-19.json) y los reportes preparados con la plantilla oficial:

- [AUTH-QA-01: falta la envoltura usuario en el registro](../qa/bugs/AUTH-QA-01-registro-contrato.md).
- [AUTH-QA-02: formato de errores distinto al contrato](../qa/bugs/AUTH-QA-02-formato-errores.md).
- [AUTH-QA-03: falta la ruta documentada /auth/perfil](../qa/bugs/AUTH-QA-03-ruta-perfil.md).

Estos hallazgos pertenecen al backend y no se corrigen en esta tarea documental. Las aserciones fallidas se conservan para que Joshua pueda revisar el resultado. Los reportes locales deben registrarse en ClickUp y enlazarse al seguimiento por el equipo; no se ha cambiado ningún estado externo.

## Revisión de Joshua

- Comprobar que los 23 casos RF1–RF8 del plan aparecen en el checklist y mantienen sus IDs.
- Importar la colección y ejecutarla completa dos veces sin modificar correos ni tokens a mano.
- Verificar que el perfil implementado acepta el token guardado por login.
- Distinguir las fallas de contrato ya reportadas de errores del ejecutor y confirmar que no hay scripts interrumpidos ni errores de transporte.
- Revisar la plantilla y los reportes de bugs. Aprobar esta documentación según la tarea; la aprobación del producto se evalúa por separado.

Referencias: [variables en Postman](https://learning.postman.com/docs/use/send-requests/variables/variables/) y [ejecución con Newman](https://learning.postman.com/docs/reference/newman-cli/command-line-integration-with-newman/).
