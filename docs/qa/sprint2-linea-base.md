# Sprint 2 · línea base

Fecha: **2026-10-28**, America/Mexico_City. Revisor requerido: **Joshua José Dávalos Durán**.

**No aprobado: 148/158 casos (93.67 %) y 766/788 aserciones (97.21 %).**
El mínimo del 95 % se cumple en aserciones, pero falla en casos. HU-28 sigue
bloqueada por esta verificación. HU-15/HU-12 no se declaran cerradas y falta la
confirmación independiente de Joshua. La regresión de gastos pasa al 100 %.

## Código y ambiente

- Fuente de aplicación: `develop` y `origin/develop` en
  `4da079f1f1f515d8bfc9f31e3fb6f31da3487ac8`, sin cambios en
  `backend/src` ni `backend/migrations`.
- HU-17: corrección `bd8dd6f`, integrada por PR #18. HU-18: `dca3fd7`,
  integrada por PR #21. HU-19: `9b639f5`, integrada por PR #24.
- Rama de entrega: `test/sprint2-linea-base`. Los archivos QA y la dependencia
  Newman se agregan sobre esa fuente; sus SHA-256 están en la evidencia.
- Windows, Node.js **v22.15.0**, PostgreSQL **17.6**, Newman **6.2.3**.
- Ejecución UTC: `2026-10-29T02:06:22.986Z`, equivalente al **28 de octubre**
  en America/Mexico_City. La marca UTC proviene del ejecutor.
- Base nueva desde `template0`, cero tablas iniciales y nueve migraciones
  aplicadas. API Express y consultas PostgreSQL reales. `GET /health` devuelve 200.
- Dos iteraciones, cuatro cuentas nuevas y **162 solicitudes HTTP**:
  158 de colección y cuatro auxiliares de limpieza. El healthcheck es previo a Newman.
- Cero errores de transporte, cero errores de scripts y cero gastos residuales.
  Base temporal eliminada al terminar. El proceso devuelve **1** por fallos de QA.

## Resultados

| Área | Casos | Aciertos | Fallos | Aserciones | Aciertos | Fallos |
|---|---:|---:|---:|---:|---:|---:|
| Autenticación | 34 | 34 | 0 | 174 | 174 | 0 |
| Categorías | 8 | 2 | 6 | 40 | 30 | 10 |
| HU-12 · Gastos | 108 | 108 | 0 | 538 | 538 | 0 |
| Limpieza | 4 | 4 | 0 | 20 | 20 | 0 |
| HU-18 · Errores globales | 4 | 0 | 4 | 16 | 4 | 12 |
| **Total** | **158** | **148** | **10** | **788** | **766** | **22** |

Caso = petición de colección por iteración; requiere todas sus aserciones
aprobadas y ninguna falla de transporte. Las aserciones auxiliares de limpieza
se incluyen en el caso padre. Los 10 casos fallidos no equivalen a 10 bugs.
El conversor valida los conteos contra los contadores de Newman.

## Comparación con HU-15

| Medición | Casos aprobados/total | Casos fallidos | Aserciones aprobadas/total |
|---|---:|---:|---:|
| HU-15, 2026-10-22, fuente histórica | 38/148 (25.68 %) | 110 | 576/726 (79.34 %) |
| Casos originales sobre el código actual y contrato v1.1 | 142/148 (95.95 %) | 6 | 734/744 (98.66 %) |
| Colección completa actual, con cinco casos adicionales por iteración | 148/158 (93.67 %) | 10 | 766/788 (97.21 %) |

La segunda fila es un subconjunto de esta ejecución, obtenido excluyendo
`QA-AUTH-ALIAS`, `QA-AUTH-SIN-CUERPO`, `QA-AUTH-LOGIN-SIN-CUERPO`, `QA-HTTP-JSON`
y `QA-HTTP-RUTA`. No es otra ejecución. Los 148 casos originales conservan su
cobertura, pero ahora exigen v1.1, token de registro y `NO_AUTORIZADO`; por eso
el número de aserciones cambia. No se suman filas ni se usa el subconjunto para
aprobar la colección completa.

## Bugs abiertos de esta verificación

Responsable y vencimiento **propuestos por acuerdo con el solicitante**:
Oscar Alejandro Arias Corona, **2026-10-29**. No implican aceptación del responsable.

| Registro | Defecto | Casos fallidos | Aserciones fallidas | ClickUp |
|---|---|---:|---:|---|
| [S2-CAT-01](bugs/S2-CAT-01-campos-categorias.md) | Faltan `tipo` y `es_predefinida` | 4 | 4 | Alta pendiente |
| [S2-CAT-02](bugs/S2-CAT-02-filtro-tipo.md) | `tipo=invalido` responde 200 | 2 | 6 | Alta pendiente |
| [S2-HTTP-01](bugs/S2-HTTP-01-errores-globales.md) | JSON malformado y ruta inexistente responden HTML | 4 | 12 | Alta pendiente |

`QA-CAT-02` falla porque no existe `tipo` en la respuesta; se vincula a S2-CAT-01.
No demuestra por sí solo el filtrado de categorías de membresía. S2-CAT-02
demuestra que un tipo inválido se acepta. La corrección debe cubrir ambos tipos
válidos y el rechazo de valores inválidos.

Se buscó una integración de ClickUp y no hubo resultados disponibles. No se
crearon tareas ni se modificaron estados externos. El archivo
[sprint2-clickup.csv](sprint2-clickup.csv) contiene los tres registros preparados
para importar, con responsable propuesto, fecha ISO, pasos y referencias.
Después de importar, se deben sustituir los estados anteriores por los enlaces
reales y verificar la asignación. **El criterio de tareas externas sigue pendiente.**

## Trazabilidad de correcciones anteriores

- AUTH-QA-01 y AUTH-QA-03: los registros devuelven `{ usuario, token }`;
  `/auth/perfil` y el alias responden 200 con la identidad correcta.
- AUTH-QA-02 y BUG-RF2-04: se comprueban `error.code` y `error.message` según v1.1;
  el cambio de contrato resuelve la expectativa antigua `codigo/mensaje`.
- BUG-RF2-01/02/03/06: POST/PUT rechazan montos con más de dos decimales,
  subcentavos, cadenas numéricas, categoría booleana y cuerpo ausente.
- BUG-RF2-05: los casos sin token y con token inválido devuelven 401
  `NO_AUTORIZADO`. Un JWT firmado y expirado no está cubierto por esta colección.
- Registro B en mayúsculas: respuesta normalizada y login en minúsculas pasan.
- Los reportes históricos quedan intactos; no se afirma el cierre de sus tareas
  externas ni una revisión de toda la lista de bugs del proyecto.

## Evidencias y repetición

- [Ejecutor](../../backend/qa/gastos.cjs).
- [Colección v1.1](../postman/billo-api.postman_collection.json).
- [Evidencia completa](../postman/ejecucion-sprint2.json).
- [Gastos: 108 casos, 538 aserciones](gastos-resultados.json), subconjunto de la misma ejecución.
- [Guía de ejecución y repetición de Joshua](../postman/README.md).

Validación local: lint de backend y mobile aprobados. La evidencia registra respuestas
sanitizadas y aserciones individuales, sin peticiones, cabeceras, contraseñas ni JWT.
No se verifica UI móvil, rendimiento, seguridad exhaustiva ni arranque de `src/index.js`.
El script nuevo sustituye al script ausente citado en el reporte antiguo de gastos;
no recrea sus 70 pruebas ni atribuye resultados a aquella ejecución histórica.

## Revisión de Joshua

- [ ] Repetir `npm ci` y `npm run qa:baseline` con el mismo código sobre una base nueva.
- [ ] Confirmar 158 casos, 788 aserciones y las mismas fallas en ambas iteraciones.
- [ ] Confirmar ausencia de errores de ejecución y limpieza de la base temporal.
- [ ] Vincular las tareas reales de ClickUp y verificar responsable y fecha.
- [ ] Tras las correcciones, repetir la colección completa y alcanzar 95 % en ambos indicadores.
- [ ] Registrar nombre, fecha y confirmación de revisión antes de cerrar la historia.
