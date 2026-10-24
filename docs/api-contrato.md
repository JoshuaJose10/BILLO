# Contrato de API — Billo (v1.1)

Estado: **esquema de BD congelado desde el 2026-10-13** (ver «Congelamiento del esquema»). Cualquier cambio al contrato o al esquema se acuerda con el equipo y se anota en el **Registro de cambios**.

Cada sección indica en qué sprint se implementa: **S1** (Sprint 1), **S2** (Sprint 2), **S3** (Sprint 3).

Este documento describe el comportamiento **acordado**. Donde el backend actual responde distinto, la diferencia se marca con **«Diferencia actual (se corrige en HU-18)»**; no se oculta ni se da por aprobada.

## Estado de implementación (verificado el 2026-10-23)

Verificado con `curl` contra el backend de `develop` (commit `30707e5`), PostgreSQL local y una cuenta QA creada para la prueba.

| Ruta | Implementada | ¿Cumple el contrato? |
|---|---|---|
| `POST /auth/register` | Sí | No: cuerpo de éxito sin envoltura ni token; sin cuerpo → 500 |
| `POST /auth/login` | Sí | Parcial: éxito correcto; sin cuerpo → 500; correo con mayúsculas al registrar no puede iniciar sesión |
| `GET /auth/perfil` | No (404 HTML) | No: solo existe el alias `/auth/profile` |
| `GET /auth/profile` (alias temporal) | Sí | Parcial: token inválido o vencido → `TOKEN_INVALIDO` |
| `GET /categorias` | Sí | No: ignora `tipo` y no devuelve `tipo` ni `es_predefinida` |
| `POST /gastos`, `PUT /gastos/:id` | Sí | Parcial: validación de monto y categoría más permisiva; sin cuerpo → 500 |
| `GET /gastos`, `DELETE /gastos/:id` | Sí | Sí, salvo el código del 401 |
| Presupuestos, catálogo, membresías, reportes, notificaciones (S2/S3) | No (404 HTML) | Pendiente de su sprint |

## Convenciones

- **Autenticación:** las rutas marcadas «requiere token» llevan el encabezado `Authorization: Bearer <token>` con el token que devuelven `POST /auth/register` y `POST /auth/login`. Sin token, con token inválido o vencido: 401 `NO_AUTORIZADO` (ver «Errores de autenticación»).
- **Formato:** JSON en petición y respuesta (`Content-Type: application/json`), **incluidas las respuestas de error**.
- **Fechas:** `YYYY-MM-DD` (por ejemplo `2026-10-05`). **Meses:** `YYYY-MM` (por ejemplo `2026-10`).
- **Montos:** número decimal mayor a 0, con hasta 2 decimales (`85.50`). Las respuestas devuelven los montos como número.
- **Correo:** se compara sin distinguir mayúsculas y minúsculas (se guarda en minúsculas).
- **Privacidad:** toda ruta con token trabaja solo con los datos del usuario del token. Un recurso de otro usuario responde igual que si no existiera (404).
- **Rol:** el token incluye el rol (`usuario` o `admin`). Las rutas de administración responden 403 `PROHIBIDO` si el rol no es `admin`. Hoy el token solo lleva `id`; el rol se agrega junto con las rutas de administración (S3).

## Formato estándar de errores
Todas las respuestas de error usan:
{ "error": { "code": "CODIGO_ERROR", "message": "Descripción legible" } }

- `code` es estable y es lo que deben evaluar la app y las pruebas.
- `message` es texto para personas; puede cambiar de redacción sin que cambie el contrato.

Ejemplo: 400 → { "error": { "code": "MONTO_INVALIDO", "message": "El monto debe ser un número mayor a 0" } }

Errores que pueden aparecer en cualquier ruta:

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `JSON_INVALIDO` | El cuerpo no es JSON válido |
| 401 | `NO_AUTORIZADO` | Ruta con token: falta, es inválido o está vencido |
| 404 | `RUTA_NO_ENCONTRADA` | La ruta o el método no existen |
| 500 | `ERROR_SERVIDOR` | Error inesperado del servidor |

> **Diferencia actual (se corrige en HU-18):** un JSON malformado responde 400 y una ruta inexistente 404, pero ambos en **HTML** de Express (sin `error.code`; el 400 incluye la traza del servidor). `POST /auth/register` responde su 500 como `{ "error": "Error interno del servidor" }` (texto, sin `code`).

### Errores de autenticación
El 401 de cualquier ruta con token usa siempre `NO_AUTORIZADO`, sea por token ausente, con formato distinto a `Bearer <token>`, inválido o vencido. El `message` puede distinguir el caso.

401 → { "error": { "code": "NO_AUTORIZADO", "message": "El token es inválido o ha expirado" } }

> **Diferencia actual (se corrige en HU-18):** token ausente o sin `Bearer` → `NO_AUTORIZADO` (correcto); token inválido o vencido → `TOKEN_INVALIDO`.

## Autenticación (S1)

### POST /auth/register  (público)
Body: { "nombre": "Ana", "email": "ana@correo.com", "password": "Segura123" }
- 201 → { "usuario": { "id": 7, "nombre": "Ana", "email": "ana@correo.com" } }
- 400 → EMAIL_INVALIDO, PASSWORD_MUY_CORTA (mínimo 8 caracteres)
- 409 → EMAIL_DUPLICADO

### POST /auth/login  (público)
Body: { "email": "ana@correo.com", "password": "Segura123" }
- 200 → { "token": "...", "usuario": { "id": 7, "nombre": "Ana" } }
- 401 → CREDENCIALES_INVALIDAS (mismo mensaje si el correo no existe o la contraseña es incorrecta)

### GET /auth/perfil  (requiere token)
- 200 → { "id": 7, "nombre": "Ana", "email": "ana@correo.com" }
- 401 → NO_AUTORIZADO (falta token, token inválido o vencido)

## Categorías (S1)

### GET /categorias?tipo=gasto  (requiere token)
Query opcional: `tipo` = `gasto` o `membresia`. Sin `tipo` devuelve todas.
- 200 → [ { "id": 1, "nombre": "Comida", "tipo": "gasto", "es_predefinida": true }, ... ]
- 400 → TIPO_INVALIDO

Lista inicial (cargada por migración o seed): Comida, Transporte, Entretenimiento, Servicios, Salud y Otros.

## Gastos (todas requieren token) (S1)

`metodo_pago` acepta: `efectivo`, `tarjeta`, `transferencia`, `otro`. `nota` es opcional (máximo 200 caracteres).

### POST /gastos
Body: { "monto": 85.50, "categoria_id": 3, "fecha": "2026-10-05", "metodo_pago": "efectivo", "nota": "Tacos" }
- 201 → { "gasto": { "id": 41, "monto": 85.50, "categoria_id": 3, "fecha": "2026-10-05", "metodo_pago": "efectivo", "nota": "Tacos" } }
- 400 → MONTO_INVALIDO, CATEGORIA_INEXISTENTE, FECHA_INVALIDA, METODO_PAGO_INVALIDO

> S2: cuando el gasto toca una categoría con presupuesto en ese mes, la respuesta agrega `"alerta"` (ver Presupuestos). Es un campo adicional: no cambia lo implementado en S1.

### GET /gastos?mes=2026-10&categoria_id=3
Los filtros `mes` y `categoria_id` son opcionales. Orden: fecha descendente.
- 200 → [ { "id": 41, "monto": 85.50, "categoria_id": 3, "fecha": "2026-10-05", "metodo_pago": "efectivo", "nota": "Tacos" }, ... ]
- 400 → MES_INVALIDO

### PUT /gastos/:id
Body: igual que POST
- 200 → { "gasto": { ... } } (gasto actualizado)
- 400 → MONTO_INVALIDO, CATEGORIA_INEXISTENTE, FECHA_INVALIDA, METODO_PAGO_INVALIDO
- 404 → GASTO_NO_ENCONTRADO (no existe o no pertenece al usuario)

### DELETE /gastos/:id
- 200 → { "eliminado": true }
- 404 → GASTO_NO_ENCONTRADO

## Presupuestos (todas requieren token) (S2) — RF3, RF4

Un presupuesto es único por usuario, categoría y mes (restricción única de la tabla).

Estado del presupuesto (lo calcula la API, no se guarda):

| Estado | Condición | Significado |
|---|---|---|
| `ok` | gastado < 80 % del límite | Sin aviso |
| `alerta` | 80 % ≤ gastado ≤ 100 % del límite | Se acerca al límite (RF4) |
| `excedido` | gastado > 100 % del límite | Se pasó del presupuesto (RF4) |

El umbral de 80 % es un supuesto por confirmar con el equipo (plan de pruebas).

### POST /presupuestos
Body: { "categoria_id": 3, "mes": "2026-10", "monto_limite": 1500 }
- 201 → { "presupuesto": { "id": 5, "categoria_id": 3, "mes": "2026-10", "monto_limite": 1500 } }
- 400 → MONTO_INVALIDO, CATEGORIA_INEXISTENTE, MES_INVALIDO
- 409 → PRESUPUESTO_DUPLICADO (ya existe uno para esa categoría y mes; usar PUT)

### GET /presupuestos?mes=2026-10
`mes` es obligatorio.
- 200 → [ { "id": 5, "categoria_id": 3, "categoria": "Comida", "mes": "2026-10", "monto_limite": 1500, "gastado": 1260.50, "porcentaje": 84, "estado": "alerta" }, ... ]
- 400 → MES_INVALIDO

### PUT /presupuestos/:id
Body: { "monto_limite": 1800 }
- 200 → { "presupuesto": { "id": 5, "categoria_id": 3, "mes": "2026-10", "monto_limite": 1800 } }
- 400 → MONTO_INVALIDO
- 404 → PRESUPUESTO_NO_ENCONTRADO

### DELETE /presupuestos/:id
- 200 → { "eliminado": true }
- 404 → PRESUPUESTO_NO_ENCONTRADO

### Aviso al registrar un gasto (campo `alerta`)
Cuando `POST /gastos` o `PUT /gastos/:id` deja una categoría en `alerta` o `excedido`, la respuesta incluye:
{ "gasto": { ... }, "alerta": { "categoria_id": 3, "porcentaje": 84, "estado": "alerta" } }
Si no hay presupuesto o el estado es `ok`, el campo `alerta` no aparece.

## Catálogo de servicios (S2 lectura / S3 administración) — RF5, RF9

### GET /catalogo  (requiere token) (S2)
- 200 → [ { "id": 1, "nombre": "Spotify", "logo_url": "https://...", "costo_sugerido": 129 }, ... ]

### POST /catalogo  (requiere token, rol admin) (S3)
Body: { "nombre": "Netflix", "logo_url": "https://...", "costo_sugerido": 199 }
- 201 → { "servicio": { "id": 2, "nombre": "Netflix", "logo_url": "https://...", "costo_sugerido": 199 } }
- 400 → NOMBRE_INVALIDO, COSTO_INVALIDO
- 403 → PROHIBIDO

### PUT /catalogo/:id  (requiere token, rol admin) (S3)
Body: igual que POST
- 200 → { "servicio": { ... } }
- 400 → NOMBRE_INVALIDO, COSTO_INVALIDO
- 403 → PROHIBIDO
- 404 → SERVICIO_NO_ENCONTRADO

### DELETE /catalogo/:id  (requiere token, rol admin) (S3)
- 200 → { "eliminado": true }
- 403 → PROHIBIDO
- 404 → SERVICIO_NO_ENCONTRADO
- 409 → SERVICIO_EN_USO (hay membresías que usan ese servicio)

## Membresías (todas requieren token) (S2) — RF5

`frecuencia` acepta: `mensual` o `anual`. `fecha_cobro` es la **próxima** fecha de cobro. `servicio_id` es opcional: si se omite, la membresía es personalizada (`nombre` y `costo` son obligatorios en ese caso). Si se envía, `nombre` y `costo` pueden omitirse y toman los valores del catálogo (`costo_sugerido`).

### POST /membresias
Body: { "nombre": "Spotify", "costo": 129, "frecuencia": "mensual", "fecha_cobro": "2026-10-20", "servicio_id": 1 }
- 201 → { "membresia": { "id": 9, "servicio_id": 1, "nombre": "Spotify", "costo": 129, "frecuencia": "mensual", "fecha_cobro": "2026-10-20" } }
- 400 → NOMBRE_INVALIDO, COSTO_INVALIDO, FRECUENCIA_INVALIDA, FECHA_INVALIDA, SERVICIO_INEXISTENTE

### GET /membresias
Orden: `fecha_cobro` ascendente.
- 200 → [ { "id": 9, "servicio_id": 1, "nombre": "Spotify", "costo": 129, "frecuencia": "mensual", "fecha_cobro": "2026-10-20", "dias_para_cobro": 7 }, ... ]

### PUT /membresias/:id
Body: igual que POST
- 200 → { "membresia": { ... } }
- 400 → NOMBRE_INVALIDO, COSTO_INVALIDO, FRECUENCIA_INVALIDA, FECHA_INVALIDA, SERVICIO_INEXISTENTE
- 404 → MEMBRESIA_NO_ENCONTRADA

### DELETE /membresias/:id
- 200 → { "eliminado": true }
- 404 → MEMBRESIA_NO_ENCONTRADA

## Reportes (requieren token) (S2) — RF6, RF8

Regla del gasto fijo: es la suma de las membresías del usuario expresadas **por mes** (`mensual` = su costo; `anual` = costo ÷ 12). El gasto variable es la suma de los gastos del mes.

### GET /reportes/resumen?mes=2026-10
`mes` es obligatorio.
- 200 → { "mes": "2026-10", "gasto_variable": 2480.50, "gasto_fijo": 428.00, "total": 2908.50 }
- 400 → MES_INVALIDO

### GET /reportes/por-categoria?mes=2026-10
Gasto variable agrupado por categoría, para la gráfica de dona (RF8). `mes` es obligatorio.
- 200 → [ { "categoria_id": 3, "categoria": "Comida", "total": 1260.50, "porcentaje": 51 }, ... ]
- 400 → MES_INVALIDO

## Notificaciones de cobro (S3) — RF7

El cron diario revisa las membresías cuya `fecha_cobro` esté a 3 días o menos y envía un push mediante Expo (el margen de 3 días es un supuesto por confirmar). Para eso la app registra el token de Expo del teléfono.

### POST /notificaciones/token  (requiere token)
Body: { "expo_push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]" }
- 200 → { "registrado": true }
- 400 → TOKEN_PUSH_INVALIDO

## Modo exploración (RF10)

No usa la API: la app muestra datos de ejemplo guardados en el propio teléfono, sin llamar al servidor y sin crear usuario. Así no existen rutas públicas con datos de ejemplo.

## Congelamiento del esquema

El esquema de `docs/esquema-bd.dbml` (seis tablas: `usuarios`, `categorias`, `gastos`, `presupuestos`, `catalogo_servicios`, `membresias`) queda **congelado desde el 2026-10-13**. Todo campo que aparece en una respuesta de este contrato existe en una de esas tablas o se calcula (`gastado`, `porcentaje`, `estado`, `dias_para_cobro`, `gasto_variable`, `gasto_fijo`, `total`).

### Cambios propuestos al esquema (pendientes de aprobar con Oscar)

Son campos nuevos y opcionales (no rompen nada de lo existente). Se aplican en una migración del Sprint 3 solo si el equipo los aprueba.

| ID | Cambio | Para qué | Estado |
|---|---|---|---|
| C-01 | `usuarios.expo_push_token` (varchar, nulo) | Guardar el token de Expo del teléfono para enviar el aviso de cobro (RF7). | Propuesto |
| C-02 | `membresias.ultima_notificacion` (date, nulo) | Evitar mandar el mismo aviso más de una vez por cobro (RF7). | Propuesto |

### Extensiones propuestas, fuera del congelamiento (por confirmar con el profesor y el equipo)

Provienen de la ampliación del Canvas. No forman parte de v1.0.

| ID | Requisito | Cambio en esquema | Cambio en API |
|---|---|---|---|
| X-01 | RF11 Cambio de moneda | `gastos.moneda` (varchar), `gastos.monto_original` (decimal), `gastos.tipo_cambio` (decimal) | Campos opcionales `moneda` y `monto_original` en `POST/PUT /gastos` y `GET /divisas/tipo-cambio?moneda=USD` |
| X-02 | RF12 Captura por voz | Ninguno | Ninguno (la app transcribe y manda `POST /gastos` normal) |
| X-03 | RF13 Widgets | Ninguno | Reutiliza `GET /reportes/resumen` |

## Registro de cambios
- 2026-09-30 — v0.1 — Primera versión (auth + gastos). Autor: Joshua.
- 2026-10-13 — v1.0 — Se agregan convenciones (encabezado de token, formatos, rol), categorías, presupuestos con estados de alerta, catálogo de servicios, membresías, reportes (resumen y por categoría), registro de token push y modo exploración sin API. En gastos se explicitan `metodo_pago` y `nota` (ya existían en el esquema). Se congela el esquema de seis tablas. Se proponen C-01 y C-02 y se dejan X-01 a X-03 como extensiones. Autor: Joshua. Aprobación: pendiente de Fernando y Oscar.