# QA de CRUD de gastos — RF2

> Reporte histórico. El script citado abajo no estaba versionado y no se puede
> reconstruir esta ejecución. La entrega actual agrega `backend/qa/gastos.cjs`
> y `docs/qa/gastos-resultados.json` para una **nueva** ejecución de Newman:
> [Sprint 2 · línea base](sprint2-linea-base.md). El JSON actual no es evidencia
> de los 70 casos históricos descritos aquí. Usar la guía actual para reproducirlo.

Fecha de revisión: 18 de octubre de 2026 (America/Mexico_City).
Rama: `feature/gastos-crud`. Commit de la aplicación: `bb11ed23471f7fce3a9bede5c89e03fee33bf4d4`.
Ambiente: Windows, Node.js `v22.15.0`, Express y PostgreSQL reales; configuración local de `backend/.env` sin divulgar credenciales.

**Resultado: 70 pruebas, 58 aprobadas y 12 fallidas. Se requieren correcciones; no se emite «QA aprobado».** Las 12 fallas corresponden a los defectos descritos abajo, no a 12 defectos distintos. `npm run lint` pasó, también después de incorporar la batería QA.

## Alcance y reproducción

Desde la raíz del repositorio:

```powershell
cd backend
node qa/gastos.cjs
npm run lint
```

Requiere dependencias instaladas, conexión a PostgreSQL y un `JWT_SECRET` configurado en `.env`. El usuario de BD necesita permiso para crear un esquema. No requiere levantar otro servidor ni ejecutar migraciones sobre las tablas existentes.

El script crea un esquema exclusivo dentro de una transacción, ejecuta las migraciones del repositorio ahí y registra dos usuarios mediante `/auth/register`. Inicia sesión por `/auth/login` y usa sus tokens reales. Monta los routers existentes con `express.json()` en un puerto local dinámico. Las consultas de los controladores se ejecutan en una única conexión dentro de esa transacción, sin simular respuestas SQL. Al finalizar hace `ROLLBACK`, eliminando el esquema, los usuarios y todos los gastos de prueba. No modifica la implementación de la aplicación.

La ejecución devuelve código `1` mientras existan casos fallidos. Los errores de servidor en las pruebas sin cuerpo son resultados observados, no errores del ejecutor. El detalle de cada petición de gastos y su respuesta está en [gastos-resultados.json](gastos-resultados.json), sin tokens ni contraseñas.

Límites: integración de routers, middleware, controladores y BD. No verifica el arranque de `src/index.js`, un despliegue remoto, la UI móvil, rendimiento ni el flujo de aprobación del PR. La marca `executedAt` del JSON es el instante UTC reportado por la máquina de ejecución.

## Criterios solicitados

| Caso | Resultado observado | Estado |
|---|---|---|
| CP-RF2-01: crear gasto válido | 201; campos correctos y propietario tomado del token, comprobado en BD | Pasa en API |
| CP-RF2-02: monto `ochenta` | 400; sin cambios en BD, tanto POST como PUT | Pasa en API |
| CP-RF2-03: categoría vacía | 400; sin cambios en BD, tanto POST como PUT | Pasa en API |
| Monto `0` y `-5` | 400; sin cambios en BD | Pasa |
| Categoría omitida, null o inexistente | 400; sin cambios en BD | Pasa |
| A consulta sus gastos y B los suyos | Cada listado coincide exactamente con los IDs del propietario en BD | Pasa |
| A modifica/elimina gasto de B y viceversa | 404 idéntico al de un ID inexistente; BD sin cambios | Pasa |
| `usuario_id` ajeno en POST/PUT | Se ignora; no cambia el propietario tomado del token | Pasa |
| Filtros mes, categoría y ambos | Resultados exactos, incluidos límites de octubre y resultado vacío | Pasa |
| Orden del listado | Fecha descendente | Pasa |
| PUT propio y DELETE propio | 200; actualización persistida y eliminación comprobada; segundo DELETE da 404 | Pasa |
| Sin token, token inválido o vencido en las cuatro rutas | 401 y sin cambios en gastos | Pasa el status; falla el contrato de error |
| Fecha imposible, formato inválido, método inválido y nota de 201 caracteres | 400; sin cambios en BD | Pasa |
| Montos y tipos fuera del contrato; cuerpo ausente | Ver defectos | Falla |

Revisión estática: `router.use(authMiddleware)` protege todas las rutas de gastos. POST toma `req.usuario.id`; GET filtra por propietario; PUT y DELETE incluyen `WHERE id = $1 AND usuario_id = $2`. Los valores se pasan como parámetros SQL. Las partes dinámicas de GET son condiciones internas y posiciones de parámetros. Además, una nota con texto SQL se guardó como texto sin borrar registros; esta prueba es una comprobación puntual, no una auditoría exhaustiva de seguridad.

## Defectos reproducibles

Precondiciones comunes: iniciar sesión como A; disponer de categoría `1` y de un gasto propio con ID `1` en el entorno aislado. En otro entorno se deben sustituir esos IDs por los devueltos por la API. Enviar `Authorization: Bearer <tokenA>` y, cuando haya cuerpo, `Content-Type: application/json`.

Cuerpo base utilizado:

```json
{"monto":80.5,"categoria_id":1,"fecha":"2026-10-18","metodo_pago":"efectivo","nota":"QA tacos"}
```

Cada defecto se reproduce independientemente en el ambiente indicado al inicio. Severidades propuestas según `docs/criterios-calidad.md`; prioridad, responsable y fecha de corrección quedan por asignar con el equipo.

### BUG-RF2-01 — Se aceptan más de dos decimales y se puede guardar un gasto de cero

- Severidad propuesta: **Media**, según el ejemplo de montos con más de dos decimales del criterio de calidad. El caso que termina en cero también incumple la regla de monto mayor que cero.
- Pasos: enviar `POST /gastos` con el cuerpo base cambiando `monto` a `80.555`; repetir con `0.001`. Repetir mediante `PUT /gastos/1`.
- Esperado: 400, mensaje de monto inválido y ningún cambio persistido; el contrato permite hasta dos decimales.
- Obtenido: POST 201 y PUT 200; `80.555` se guarda como `80.56`, y `0.001` como **0**.
- Evidencia: `MONTO-DECIMALES-POST`, `MONTO-DECIMALES-PUT`, `MONTO-SUBCENTAVO-POST`, `MONTO-SUBCENTAVO-PUT` en el JSON.

### BUG-RF2-02 — Se acepta monto como cadena numérica

- Severidad propuesta: **Media**.
- Pasos: enviar POST con el cuerpo base y `"monto":"80.50"`; repetir mediante PUT propio.
- Esperado: 400 sin cambios, conforme al tipo número definido en las convenciones del contrato.
- Obtenido: POST 201 y PUT 200; la cadena se convierte a `80.5`.
- Evidencia: `MONTO-STRING-POST`, `MONTO-STRING-PUT`.
- Si el equipo quiere aceptar cadenas, debe acordar y actualizar el contrato antes de cambiar esta expectativa QA.

### BUG-RF2-03 — Una categoría booleana se convierte al ID 1

- Severidad propuesta: **Media**.
- Pasos: enviar POST con el cuerpo base y `"categoria_id":true`; repetir mediante PUT propio.
- Esperado: 400 sin inserción/actualización; un booleano no es un identificador de categoría.
- Obtenido: POST 201 y PUT 200; `true` se transforma en categoría `1`.
- Evidencia: `CAT-BOOL-POST`, `CAT-BOOL-PUT`.

### BUG-RF2-04 — Las claves de los errores no cumplen el contrato

- Severidad propuesta: **Media**; afecta a consumidores que leen las claves acordadas.
- Pasos: enviar POST con el cuerpo base y `"monto":0`.
- Esperado: `400 {"error":{"codigo":"MONTO_INVALIDO","mensaje":"..."}}`.
- Obtenido: `400 {"error":{"code":"MONTO_INVALIDO","message":"El monto debe ser un número mayor a 0"}}`.
- Evidencia: `ERROR-CONTRATO`; la misma diferencia de claves aparece en las respuestas de autenticación registradas.

### BUG-RF2-05 — Código de autenticación distinto al acordado

- Severidad propuesta: **Media**. El acceso se rechaza; no se observó una omisión de autenticación.
- Pasos: solicitar `GET /gastos` con `Authorization: Bearer invalido`.
- Esperado: 401 con código `NO_AUTORIZADO`, según las convenciones para token ausente, inválido o vencido.
- Obtenido: 401 con `error.code: "TOKEN_INVALIDO"`.
- Evidencia: respuesta de `AUTH-CONTRATO` y casos de token inválido/vencido. La aserción de `AUTH-CONTRATO` falla primero por el nombre de la clave; la respuesta registrada permite verificar también el valor incorrecto.

### BUG-RF2-06 — POST y PUT sin cuerpo producen error interno

- Severidad propuesta: **Media**; ocurre con una petición inválida, mientras que el flujo válido sí funciona.
- Pasos: enviar `POST /gastos` con token válido, sin cuerpo ni `Content-Type`; repetir con `PUT /gastos/1`.
- Esperado: 400 por datos obligatorios ausentes, sin cambios en BD.
- Obtenido: 500; el servidor intenta desestructurar `req.body` cuando es `undefined`.
- Evidencia: `BODY-AUSENTE-POST`, `BODY-AUSENTE-PUT` y mensajes del controlador durante la ejecución.

## Ejemplos para Fernando y QA

Ejemplos representativos del flujo válido observado. El ID se obtiene del POST y se reutiliza para PUT/DELETE; los tokens se obtienen por login.

| Petición con token A | Cuerpo | Respuesta |
|---|---|---|
| `POST /gastos` | `{"monto":80.5,"categoria_id":1,"fecha":"2026-10-18","metodo_pago":"efectivo","nota":"QA tacos"}` | 201 `{"gasto":{"id":1,"monto":80.5,"categoria_id":1,"fecha":"2026-10-18","metodo_pago":"efectivo","nota":"QA tacos"}}` |
| `GET /gastos?mes=2026-10&categoria_id=1` | Sin cuerpo | 200; arreglo de gastos propios que cumplen ambos filtros, ordenado por fecha descendente |
| `PUT /gastos/1` | `{"monto":99.9,"categoria_id":1,"fecha":"2026-10-18","metodo_pago":"tarjeta","nota":"QA tacos"}` | 200 `{"gasto":{"id":1,"monto":99.9,"categoria_id":1,"fecha":"2026-10-18","metodo_pago":"tarjeta","nota":"QA tacos"}}` |
| `DELETE /gastos/1` | Sin cuerpo | 200 `{"eliminado":true}` |

Para la prueba de privacidad, crear un gasto con A e intentar PUT y DELETE de ese ID con el token B: ambos deben responder 404 y el gasto debe continuar intacto para A. También comprobar GET en ambos sentidos.

## Dictamen y seguimiento

Los escenarios básicos de aceptación y la privacidad entre A/B pasaron en API. Hay incumplimientos del contrato y un monto positivo que termina persistido en cero; se recomienda corregirlos y repetir esta batería antes del dictamen final de Luis Dorian.

Este reporte no publica comentarios ni cambia estados en ClickUp o GitHub. No se crearon commits, push ni PR, ni se verificaron aprobaciones del PR existente. Se conservaron los cambios locales previos en Postman y `mobile/package-lock.json`.
