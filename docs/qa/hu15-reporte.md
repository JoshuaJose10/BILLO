# HU-15 — Pruebas API de autenticación y gastos

Fecha: **2026-10-22**, America/Mexico_City. Rama de trabajo: `HU-15-Pruebas-de-la-API-de-auth-y-gastos-en-Postman`. Backend tomado de `origin/develop`, commit **`8b9975f`**; el identificador completo y el árbol de backend están en la evidencia.

**Colección ejecutada, con resultados pendientes de corrección del backend. No se emite aprobación general de calidad.** Por instrucción del solicitante, se usa `/auth/profile` y no se crean reportes de bugs nuevos. La discrepancia de `/auth/perfil` queda fuera del alcance de esta ejecución; los documentos históricos no se modifican.

## Ambiente y ejecución

- Windows, Node.js v22.15.0, PostgreSQL local y Newman 6.2.3.
- Dependencias instaladas con `npm install`; siete migraciones ejecutadas mediante `npm run migrate`.
- Arranque real con `npm run dev`; `/health` → 200 y conexión a PostgreSQL confirmada.
- Colección completa: **74 peticiones × 2 iteraciones = 148 casos**. Se crean dos usuarios distintos por iteración: cuatro cuentas en total.
- **160 solicitudes HTTP**, incluidas 12 auxiliares de limpieza; no equivalen a 160 casos de colección.
- **726 aserciones: 576 aprobadas y 150 fallidas**. Newman terminó con código 1 por las aserciones fallidas.
- **0 errores de transporte y 0 errores de scripts**. `npm run lint` del backend pasó.

## Resumen por historia / área

Un caso se considera aprobado únicamente si pasan todas sus aserciones. Un HTTP correcto puede tener una aserción de contrato fallida. Los nombres de registro/login/perfil separan las partes de RF1 sin inventar números de historias no documentados.

| Historia / área | Casos ejecutados | Aprobados | Fallidos | Bloqueados | Seguimiento de bugs |
|---|---:|---:|---:|---:|---|
| RF1 — Registro, A/B y negativos | 12 | 0 | 12 | 0 | AUTH-QA-01 y AUTH-QA-02 previos |
| RF1 — Login, A/B y negativos | 8 | 4 | 4 | 0 | AUTH-QA-02 previo |
| RF1 — Perfil mediante `/auth/profile` | 8 | 4 | 4 | 0 | AUTH-QA-02 previo; diferencia de ruta excluida |
| Categorías — dependencia de HU-12 | 8 | 0 | 8 | 0 | Sin reportes nuevos por alcance acordado |
| HU-12 — Gastos RF2 | 108 | 26 | 82 | 0 | Hallazgos históricos en gastos-reporte; sin reportes nuevos |
| Limpieza de datos de prueba | 4 | 4 | 0 | 0 | Sin fallas |
| **Total** | **148** | **38** | **110** | **0** | **0 reportes nuevos** |

| Agrupación de colección | Aserciones aprobadas | Aserciones fallidas |
|---|---:|---:|
| Autenticación | 118 | 20 |
| Categorías | 26 | 12 |
| HU-12 Gastos | 404 | 118 |
| Limpieza | 28 | 0 |
| **Total** | **576** | **150** |

Los archivos previos [AUTH-QA-01](bugs/AUTH-QA-01-registro-contrato.md) y [AUTH-QA-02](bugs/AUTH-QA-02-formato-errores.md) se describen como abiertos y pendientes de registrar en ClickUp. Son **dos reportes previos únicos dentro del alcance**, compartidos entre filas; no se suman por fila. AUTH-QA-03 se excluye por la decisión sobre la ruta. El [reporte histórico de gastos](gastos-reporte.md) describe seis hallazgos cuya asignación/cierre externo no se verificó. No se afirma que haya cero bugs abiertos ni se han cambiado estados del tablero.

## Comportamiento observado

Las comprobaciones funcionales de registro/login/perfil A/B pasaron. Se mantienen fallas de la envoltura del registro y formato de errores documentadas anteriormente. El catálogo devuelve datos utilizables para preparar gastos; sus comprobaciones de contrato y filtrado no pasan.

En gastos se comprobaron creación, consulta, actualización persistida y eliminación. **La privacidad pasó en ambos sentidos**: las listas mostraron solamente el gasto propio, los PUT/DELETE ajenos respondieron 404 y la consulta posterior confirmó ambos gastos intactos. Los casos de ataque figuran como fallidos por la aserción de formato del error, aunque la restricción de acceso pasó.

Los resultados detallados conservan diferencias de validación y respuestas de error, incluidos negativos de monto, categoría y cuerpo ausente. No se han transformado en reportes nuevos por instrucción del solicitante. No se modificó la API para ocultar resultados ni se cambiaron expectativas para hacer pasar la colección.

## Evidencia y revisión de Joshua

- [Colección final](../postman/billo-api.postman_collection.json).
- [Evidencia sanitizada por petición y aserción](../postman/ejecucion-hu15-2026-10-22.json).
- [Instrucciones de Runner/Newman y cobertura](../postman/README.md).
- [Conversor de evidencia](../postman/resumir-ejecucion.cjs): elimina credenciales y comprueba que los totales coincidan con Newman. Los contextos repetidos por solicitudes auxiliares se cuentan una sola vez por caso e iteración.

La evidencia registra el commit y SHA-256 de la colección ejecutada. Los resultados se repiten en ambas iteraciones. Cada respuesta está acompañada por sus aserciones; los totales se obtienen de esos resultados, sin sumar ejecuciones históricas.

La limpieza comprobó listas vacías para A/B al terminar cada iteración, incluidos los gastos que negativos aceptados indebidamente llegaron a crear. Las cuatro cuentas QA permanecen porque la API no ofrece borrado de cuentas. No se modificaron usuarios preexistentes.

## Regresión y entrega

No hubo correcciones del backend durante esta tarea. La segunda iteración verifica repetibilidad, no una regresión posterior a una corrección. Tras los cambios de las historias afectadas, repetir toda la colección, registrar el nuevo commit y guardar otra evidencia antes de emitir el visto bueno.

El alcance de bugs y perfil se ajustó a lo solicitado; la HU original no queda íntegramente satisfecha en esas condiciones. La entrega de pruebas está preparada para revisión, con las fallas visibles. La publicación del PR requiere autenticación de GitHub en este entorno; no se afirma que ya exista un PR.
