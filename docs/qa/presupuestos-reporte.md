# QA presupuestos

Fecha local: **2026-11-03**, America/Mexico_City. Prioridad: Alta. Revisa: **Joshua**.

**Resultado general: NO APROBADO para cierre.** Los cálculos, los umbrales y el aislamiento de la API pasan. El móvil pierde el aviso al guardar un gasto: [PRES-QA-01](bugs/PRES-QA-01-aviso-mobile.md), severidad Alta, responsable Fernando Villafuerte. La ejecución visual en Android y la repetición propia de Joshua están pendientes.

## Dictamen por historia

Se usa la asociación de esta tarea: HU-24 / RF3 y HU-29 / RF4. El código del aviso también lo referencia como HU-25; conservar esa referencia técnica no cambia las dependencias solicitadas.

| Historia | Dictamen técnico | Condición para cierre |
|---|---|---|
| HU-24 — presupuestos, RF3 | **APROBADO en API**: CRUD, validaciones, unicidad, cálculo y aislamiento | Joshua debe confirmar los números con una ejecución propia; confirmar el flujo visual de CP-RF3-01/02 |
| HU-29 — alertas, RF4 | **NO APROBADO**: API correcta, aviso perdido en el servicio móvil | Resolver PRES-QA-01, repetir QA, comprobar el aviso visible y obtener confirmación de Joshua |

Este reporte no registra una aprobación humana ni autoriza cerrar las historias pendientes.

## Ambiente y evidencia

- Rama: `test/qa-presupuestos`, creada desde `develop` en `58ac43e6722d9b2600b1be136c302e30e6a27660`.
- Windows, Node **22.15.0**, PostgreSQL **17.6**, Newman **6.2.3** del lockfile.
- Express y PostgreSQL reales. Base nueva desde `template0`, diez migraciones, cero tablas públicas iniciales. Se comprueba cero gastos y presupuestos después de la limpieza por API y se elimina exclusivamente la base temporal creada por cada ejecución.
- No se modificaron los controladores ni la lógica de la app. No se usó `DB_NAME` de desarrollo como destino de pruebas.
- [Resultados sanitizados](presupuestos-resultados.json): resultados por petición y aserción, respuestas sin sesiones, grupos, fallos del servicio móvil, fecha UTC, commit base y SHA-256 de los archivos realmente ejecutados. El commit base no incluye los archivos nuevos aún sin commit; los hashes identifican su contenido.
- [Suite RF3/RF4](presupuestos-automatizadas.tap), [regresión completa backend](presupuestos-regresion.tap) y [pruebas de utilidades móviles](presupuestos-mobile.tap).

## Resultados ejecutados

| Ejecución | Total | Pasan | Fallan | Evidencia |
|---|---:|---:|---:|---|
| Postman / Newman, 87 peticiones × 2 iteraciones | 174 | 174 | 0 | `summary` y `executions` del JSON |
| Aserciones de esas peticiones, incluidas solicitudes auxiliares de limpieza | 638 | 638 | 0 | `stats.assertions` y `summary` del mismo JSON |
| Pruebas nuevas de API, independientes y con reinicio de fixtures | 49 | 49 | 0 | `integration` y TAP RF3/RF4 |
| Regresión backend completa | 152 | 152 | 0 | TAP de regresión |
| Utilidades móviles, cuatro casos nuevos de límites | 33 | 33 | 0 | TAP móvil |
| Adaptador móvil real, con React y transporte aislados | 6 | 2 | 4 | `mobile.results` del JSON |

Las 49 pruebas nuevas están incluidas en las 152 de regresión: **no se suman de nuevo**. Las peticiones incluyen preparación, consultas y limpieza; no representan 174 casos funcionales distintos. Tampoco se suman las aserciones como casos. No hubo casos omitidos, cancelados ni errores de ejecución en la suite RF3/RF4 o en Newman.

| Carpeta Postman | Peticiones en dos iteraciones | Aserciones |
|---|---:|---:|
| Preparación aislada | 6 | 18 |
| CP-RF3 presupuestos | 46 | 140 |
| CP-RF4 alertas y límites | 84 | 266 |
| Aislamiento y recálculo | 34 | 104 |
| Limpieza por API | 4 | 110 |

## Casos y oráculo

Se mantienen los cinco IDs del [plan del proyecto](../plan-de-pruebas.md). Los meses y fechas son fixtures fijas para que una repetición no dependa del día actual. Los equivalentes de API no certifican los pasos visuales del plan.

| Caso | Datos y resultado esperado | Resultado observado |
|---|---|---|
| CP-RF3-01 | Crear presupuesto 2000; consultar límite, mes, categoría y gastado 0 | Pasa en API |
| CP-RF3-02 | Rechazar -500 con 400 `MONTO_INVALIDO`, sin insertar ni alterar presupuesto existente | Pasa en POST y PUT |
| CP-RF4-01 | Límite 1000, previo 700 + gasto 100 = 800; `alerta`, porcentaje 80 | Pasa en POST, PUT y GET; el adaptador móvil pierde el aviso |
| CP-RF4-02 | Límite 1000, previo 950 + gasto 100 = 1050; `excedido`, porcentaje 105 | Pasa en POST, PUT y GET; el adaptador móvil pierde el aviso |
| CP-RF4-03 | Límite 1000, previo 100 + gasto 50 = 150; `ok`, sin campo `alerta` | Pasa en API; sin aviso en el adaptador aislado |

Los umbrales se contrastan con importes exactos. El contrato exige `ok` para menos de 80 %, `alerta` de 80 % a 100 % inclusive y `excedido` por encima de 100 %. La API actual redondea `porcentaje` a entero; no se utiliza ese entero para decidir el estado esperado. No se certifica aquí una precisión de presentación de dos decimales.

| Caso de límite | Límite | Gastado acumulado | Porcentaje exacto | `porcentaje` de API | Estado / aviso esperado | API POST, PUT, GET y utilidad móvil |
|---|---:|---:|---:|---:|---|---|
| CP-RF4-L7999 | 10000 | 7999 | 79,99 % | 80 | `ok`, sin aviso | Pasa |
| CP-RF4-L80 | 10000 | 8000 | 80 % | 80 | `alerta`, aviso | Pasa |
| CP-RF4-L100 | 10000 | 10000 | 100 % | 100 | `alerta`, aviso; excedente 0 | Pasa |
| CP-RF4-L10001 | 10000 | 10001 | 100,01 % | 100 | `excedido`, aviso; excedente 1 | Pasa |

El test móvil de límites verifica que normalizar el presupuesto, elegir el estado más grave y calcular excedente no cambien `ok` a `alerta` por el redondeo, ni pierdan `excedido` cuando el porcentaje publicado sea 100.

## Aislamiento y recálculo

- Dos usuarios pueden tener presupuesto de la misma categoría y mes; no comparten sumas. El listado excluye registros ajenos y PUT/DELETE ajenos devuelven 404. La suite automatizada comprueba ambos sentidos A→B y B→A, con los datos del propietario intactos.
- Para A, noviembre con 799.99/1000 permanece `ok` aunque B tenga 1000 en noviembre, A tenga 1000 en diciembre y otra categoría tenga 5000. Diciembre y el usuario B conservan sus propios totales; un mes sin datos devuelve `[]`.
- La unicidad solo aplica a usuario + categoría + mes. Cambiar límite recalcula el porcentaje; editar un gasto reemplaza su importe sin duplicarlo; moverlo de mes o categoría y borrarlo actualiza el presupuesto original. Eliminar un presupuesto no elimina sus gastos.
- Se prueban montos inválidos, mes obligatorio/inválido, categoría inexistente, duplicados, ausencia de token y token inválido. Los rechazos no persisten cambios.

## Bugs y tareas

| Bug | Tarea local | Severidad | Responsable | Estado |
|---|---|---|---|---|
| [PRES-QA-01: se pierde el aviso en el móvil](bugs/PRES-QA-01-aviso-mobile.md) | [QA-PRES-01](presupuestos-tareas.md#qa-pres-01--conservar-y-mostrar-el-aviso-de-presupuesto) | Alta | Fernando Villafuerte, confirmado por el solicitante | Abierto |

El seguimiento local cumple la opción de archivo de seguimiento de la plantilla del proyecto. No se creó una tarea externa ni se inventó un enlace de ClickUp. La fecha de corrección queda por acordar.

## Validaciones y límites de esta entrega

- `npm run lint` en backend: pasa.
- `npm test` en backend y móvil: pasan, según los TAP enlazados.
- `npm run lint` en móvil: no pudo completarse; el entorno instalado carece de `typescript`, requerido por `@typescript-eslint/eslint-plugin` de `eslint-config-expo`. No se cambiaron las dependencias o lockfile del usuario para resolver ese problema de entorno.
- No hubo ejecución en dispositivo/emulador Android. La ausencia de consumo del aviso en `NuevoGastoScreen` se identificó mediante inspección del código; la pérdida del dato en `services/gastos.js` sí se reprodujo ejecutando ese módulo real.
- El 80 % se utiliza conforme a esta tarea y al contrato; el supuesto histórico del plan sigue pendiente de confirmación formal de Joshua.

## Repetición y confirmación de Joshua

Seguir [las instrucciones de ejecución](../postman/presupuestos.md) y usar otro `QA_OUTPUT_DIR` para conservar esta evidencia. Comparar el mismo código y lockfiles con los SHA-256 publicados.

Joshua debe obtener: 174 peticiones correctas, 638 aserciones correctas, 49/49 pruebas RF3/RF4 y el mismo bug móvil (2/6 pasan, 4/6 fallan) mientras siga abierto. La regresión backend debe dar 152/152 y las utilidades móviles 33/33. Tiempos, puertos, IDs, UUID, correos, sesiones y nombres de bases pueden variar. Los totales, estados, importes, nombres de fallos y limpieza deben coincidir.

- [ ] Joshua ejecutó el código identificado por los hashes.
- [ ] Confirmó los totales y los resultados por límite de este reporte.
- [ ] Confirmó el umbral y la interpretación del 100 % inclusive.
- [ ] Registró su evidencia, fecha y dictamen propio.
- [ ] Tras resolver el bug, verificó el aviso visible en Android para POST y PUT.

Confirmación de Joshua: **pendiente**. Fecha / evidencia de su repetición: **pendientes**.
