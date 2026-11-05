# QA presupuestos

Fecha: **2026-11-04**, zona `America/Mexico_City`.
Dependencias evaluadas: **HU-24 y HU-29**, sobre el `develop` local.
Rama de trabajo: `test/qa-presupuestos`.
Base: `f1f3a46707da0d9c28a9845d5df1c161244e0573`.
Ejecución realizada por el asistente en el entorno local; revisión requerida: **Joshua**.

## Dictamen por historia

| Historia | Resultado de los cálculos y del contrato HTTP | Cierre de la historia |
|---|---|---|
| HU-24 | **APROBADO en alcance API**: creación, consulta, edición, eliminación, validación y cálculo de presupuestos; aislamiento de usuarios, meses y categorías. | **NO APROBADO para cierre todavía**: falta la ejecución propia y confirmación de Joshua. |
| HU-29 | **APROBADO en alcance API**: CP-RF3/CP-RF4, límites y alertas al crear/editar gastos; recálculo y aislamiento. | **NO APROBADO para cierre todavía**: falta la ejecución propia y confirmación de Joshua. |

Estos dictámenes corresponden al alcance RF3/RF4 solicitado para ambas dependencias;
no certifican otros criterios de las historias que no estén descritos en esta tarea.
La prueba HTTP de CP-RF4 verifica el campo `alerta` de la respuesta. La aparición
visual del aviso, navegación, vibración y lector de pantalla requieren dispositivo
y no se declaran ejecutadas. El umbral solicitado de 80 % se usa como criterio
de esta ejecución; los documentos históricos aún lo señalan como supuesto.

## Ambiente y evidencia

- Windows x64, Node **22.15.0**, Newman **6.2.3**, PostgreSQL **17.6**.
- API Express real (`backend/src/app.js`), con los controladores de `develop`
  sin modificaciones. Cada runner usa una base temporal nueva e independiente.
- Las diez migraciones se aplican desde cero. La ejecución Newman termina con
  **0 gastos y 0 presupuestos**; su base queda eliminada (`database.dropped: true`).
- El commit identifica la base; los archivos nuevos son cambios locales sin commit.
  Los SHA-256 de fuentes, pruebas, lockfile y colección ejecutados están en
  [presupuestos-resultados.json](presupuestos-resultados.json).
- [Ejecución Postman/Newman](../postman/ejecucion-presupuestos.json): respuesta
  sanitizada, HTTP y resultado de cada aserción por petición e iteración,
  estadísticas, migraciones y limpieza. No contiene sesiones ni contraseñas.
- [Regresión completa del backend](presupuestos-backend.tap) y
  [regresión unitaria móvil](presupuestos-mobile.tap): salida TAP con casos y resultados.

`executedAt` conserva el instante UTC de la ejecución; la fecha local de este
reporte es el 4 de noviembre, aunque el instante UTC corresponda al día 5.

## Casos ejecutados y resultados

| Ejecución | Casos correctos / ejecutados | Fallidos | Omitidos |
|---|---:|---:|---:|
| Integración nueva RF3/RF4, `npm run test:presupuestos` | **49 / 49** | 0 | 0 |
| Colección dedicada, 202 peticiones × 2 iteraciones | **404 / 404** | 0 | 0 |
| Aserciones de la colección, incluidas las auxiliares de limpieza | **1.468 / 1.468** | 0 | 0 |
| Regresión completa backend, `npm test` | **175 / 175** | 0 | 0 |
| Regresión unitaria móvil existente, `npm test` | **66 / 66** | 0 | 0 |

Las 49 pruebas nuevas **ya están incluidas** en las 175 del backend. Las
aserciones no son casos adicionales. Newman realiza 646 solicitudes HTTP:
404 peticiones principales y 242 auxiliares de limpieza. Se exige **100 %**
de casos y aserciones correctos, sin errores de ejecución ni datos residuales.

| Carpeta Newman | Casos, dos iteraciones | Aserciones | Resultado |
|---|---:|---:|---|
| Preparación: cuentas y categorías | 6 | 18 | Pasa |
| RF3: creación, validación y CRUD | 72 | 216 | Pasa |
| RF4: casos del plan y límites por POST/PUT | 148 | 458 | Pasa |
| RF3/RF4: aislamiento | 70 | 210 | Pasa |
| Limpieza | 108 | 566 | Pasa |
| **Total** | **404** | **1.468** | **Pasa** |

### Trazabilidad funcional

Cada fila se verifica tanto en la [suite automatizada](../../backend/test/suites/presupuestos.cjs)
como en la [colección Postman](../postman/presupuestos.postman_collection.json).
Los nombres y resultados individuales están en los dos JSON de evidencia.

| Caso / grupo | Datos y resultado esperado | Resultado observado |
|---|---|---|
| CP-RF3-01 | Crear presupuesto de $2.000, consultarlo sin gastos. | 201 y consulta 200; límite 2000, gastado 0, porcentaje 0, `ok`. Pasa. |
| CP-RF3-02 | Crear presupuesto de -$500. | 400 `MONTO_INVALIDO`; no se persiste. Pasa. |
| RF3-CERO/TEXTO/DECIMALES/PRECISION/MAXIMO/MES/CATEGORIA | Rechazar cero, cadena numérica, subcentavo, más de dos decimales, monto fuera de rango, mes 13 y categoría inexistente. | 400 con código estructurado y sin registros inválidos. Pasa. |
| RF3-DUPLICADO | Repetir usuario/categoría/mes con otro límite. | 409 `PRESUPUESTO_DUPLICADO`; límite original intacto. Pasa. |
| RF3-CRUD / RF3-PUT-INVALIDO | Cambiar límite y recalcular estado; rechazar edición negativa; eliminar presupuesto. | Recálculo correcto; 400 no altera límite; eliminación conserva gastos. Pasa. |
| RF3-GET-MES | Mes ausente, vacío, sin dos dígitos, 00, 13 o fecha completa. | 400 `MES_INVALIDO`. Pasa. |
| RF3-AUTH-* | GET/POST/PUT/DELETE sin token y con token inválido. | 401 `NO_AUTORIZADO`, sin presupuesto nuevo. Pasa. |
| CP-RF4-01-POST/PUT | $700 + $100 sobre límite $1.000. | Total 800; porcentaje 80; `alerta`. Pasa. |
| CP-RF4-02-POST/PUT | $950 + $100 sobre límite $1.000. | Total 1050; porcentaje 105; `excedido`. Pasa. |
| CP-RF4-03-POST/PUT | $100 + $50 sobre límite $1.000. | Total 150; porcentaje 15; `ok`; sin campo `alerta`. Pasa. |
| CP-RF4-04 a 07 | Cuatro límites, por creación y edición, comprobados también mediante GET. | Ver matriz siguiente. Todos pasan. |
| RF4-CENTAVO | Límite $100; gasto $100,01. | `excedido` desde el primer centavo adicional. Pasa. |
| RF4-SIN-PRESUPUESTO-POST/PUT | Crear/editar gasto sin presupuesto aplicable. | Gasto guardado sin campo `alerta`. Pasa. |
| RF4-RECALCULO | Bajar gasto de excedido a 79,99 % y después borrarlo. | Se retira `alerta`; GET cambia a `ok` y luego a total 0. Pasa. |
| RF3/RF4-USUARIOS | A y B con la misma categoría y mes; límites 1000/2000 y gastos 150/2100. | A: 15 %, `ok`; B: 105 %, `excedido`; cada lista contiene solo su presupuesto. Pasa. |
| RF3-PRIVACIDAD-PUT/DELETE | B intenta editar/eliminar presupuesto A. | 404 `PRESUPUESTO_NO_ENCONTRADO`; presupuesto A intacto. Pasa. |
| RF3/RF4-MESES | Gastos en último/primer día de meses adyacentes y diciembre/enero. | Totales separados: septiembre 2000, octubre 800, noviembre 3000, diciembre 4000, enero 150; mes sin datos devuelve `[]`. Pasa. |
| RF3/RF4-CATEGORIAS | Misma persona y mes; gastos 150/1100 en dos categorías. | 15 %, `ok`, y 110 %, `excedido`, independientes. Pasa. |
| RF4-TRASLADO | Editar fecha y categoría de un gasto hacia otro presupuesto. | Origen queda en 0; destino recibe el total y su alerta correcta. Pasa. |

### Matriz de límites

Límite fijo: **$1.000**. Para PUT se prepara un gasto de $0,01 y se reemplaza
por el monto indicado; los valores de la tabla son los totales finales.
Se repite cada variante por POST y PUT y luego se consulta el presupuesto.

| Caso | Gasto previo | Gasto creado/editado | Total final | Porcentaje exacto | `porcentaje` recibido | Estado | Campo `alerta` | Resultado |
|---|---:|---:|---:|---:|---:|---|---|---|
| CP-RF4-04-L7999 | 700 | 99,90 | 799,90 | **79,99 %** | 80 | `ok` | Ausente | Pasa |
| CP-RF4-05-L8000 | 700 | 100 | 800 | **80 %** | 80 | `alerta` | Presente, `alerta` | Pasa |
| CP-RF4-06-L10000 | 950 | 50 | 1000 | **100 %** | 100 | `alerta` | Presente, `alerta` | Pasa |
| CP-RF4-07-L10001 | 950 | 50,10 | 1000,10 | **100,01 %** | 100 | `excedido` | Presente, `excedido` | Pasa |

El oráculo del estado compara los montos exactos: `gastado * 100` con
`monto_limite * 80`, y `gastado > monto_limite` para excedido.
**100 % sigue siendo `alerta`** según el [contrato](../api-contrato.md).

Observación de presentación: la implementación actual redondea `porcentaje`
al entero más cercano. Así, 79,99 % y 80 % se presentan como 80, y 100 % y
100,01 % como 100, con estados distintos. Las pruebas comprueban ambos campos
y no deducen el estado del porcentaje redondeado. El contrato no exige precisión
decimal para ese campo y las utilidades móviles existentes también redondean;
no se registra como defecto confirmado. Joshua debe validar si esa presentación
es suficiente para la experiencia esperada; mostrar dos decimales requeriría
acordar el cambio de presentación y actualizar las expectativas.

## Registro de bugs

**0 bugs nuevos confirmados y 0 bugs abiertos por esta ejecución.**
No hay tareas de corrección que asignar en este alcance. Esto no cierra ni
reclasifica bugs históricos de otros requisitos.

Si la repetición descubre un fallo, registrar una tarea local por defecto en
`docs/qa/bugs/` usando la [plantilla del proyecto](../plantilla-reporte-bug.md),
con ID, historia/tarea, severidad según [criterios de calidad](../criterios-calidad.md),
responsable acordado, pasos, esperado/obtenido, evidencia y reprueba. No asignar
personas sin acuerdo ni inventar enlaces de ClickUp. El registro podrá trasladarse
a ClickUp cuando se autorice; esta entrega no publica en servicios externos.

## Reproducción y revisión de Joshua

Desde la raíz, instalar las dependencias del backend con `npm ci` si hace falta.
Configurar `backend/.env` con PostgreSQL activo y un usuario con `CREATEDB`.
No se requiere servidor previo, no se usa la base `DB_NAME` del desarrollo y
el JWT se genera en memoria. Ejecutar:

```powershell
cd backend
npm run lint
npm run test:presupuestos
npm run qa:presupuestos
npm test
```

Para conservar la evidencia de esta entrega, Joshua debe ejecutar el mismo
código y lockfile con un directorio de salida distinto:

```powershell
$env:QA_OUTPUT_DIR = Join-Path $env:TEMP 'billo-presupuestos-joshua'
npm run qa:presupuestos
$qaExit = $LASTEXITCODE
Remove-Item Env:QA_OUTPUT_DIR
$qaExit
```

Debe obtener salida **0**, 49/49 en `automated.summary`, 404/404 y 1468/1468
en `postman.summary`, `executionErrors: []`, cero datos residuales y
`database.dropped: true`. Comparar también los nombres, resultados y respuestas
de los casos de límites, y los SHA-256 de `fileSha256`. El nombre aleatorio de
la base, el puerto y los instantes pueden variar. Si cambia algún archivo,
repetir la ejecución y actualizar evidencia y reporte antes de aprobar.

### Confirmación pendiente

- [ ] Joshua ejecutó la prueba sobre los mismos archivos/lockfile.
- [ ] Joshua confirmó 49 casos de integración, 404 casos de Newman y 1468 aserciones.
- [ ] Joshua comparó los cuatro límites, el aislamiento y la limpieza.
- [ ] Joshua confirmó la política de presentación del porcentaje.
- [ ] Se adjuntó su evidencia independiente y dictamen de cierre por historia.

Fecha de repetición: **pendiente**. Evidencia de Joshua: **pendiente**.
Confirmación de Joshua: **pendiente**. No se atribuye una aprobación en su nombre.
