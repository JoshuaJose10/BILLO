# QA membresías y reportes

Fecha: **2026-11-05**, zona `America/Mexico_City`. Dependencias verificadas en
conjunto: **HU-26, HU-31 y HU-32** (RF5, RF6 y RF8).

Resultado: **APROBADO en el alcance API**. Pasan 43/43 casos nuevos de integración,
270/270 peticiones de Newman y 830/830 aserciones. La regresión completa pasa
218/218 pruebas y `npm run lint` termina sin errores. **Revisión de Joshua pendiente**.

Se ejecutaron Express y PostgreSQL reales, Node v22.15.0 y Newman 6.2.3, con
las diez migraciones sobre bases temporales nuevas. Cada iteración de Postman
creó cuentas A/B nuevas. El runner comprobó cero gastos y membresías al terminar
y eliminó la base temporal. Nunca se usó `DB_NAME` de desarrollo como destino.

Evidencia de la ejecución:

- [Resultados de integración, entorno y hashes SHA-256](membresias-reportes-resultados.json).
- [Peticiones, respuestas sanitizadas y aserciones de Newman](../postman/ejecucion-membresias-reportes.json).
- [Colección Postman v2.1 importable](../postman/membresias-reportes.postman_collection.json).
- [Suite automatizada](../../backend/test/suites/membresias-reportes.cjs), incluida en `npm test` y CI.

Los JSON identifican el commit base y los archivos locales ejecutados mediante
hashes; el commit base por sí solo no contiene los cambios de esta entrega.
No se guardan cabeceras, contraseñas ni tokens de las sesiones de Newman.

## Regla de conciliación

Según el [contrato](../api-contrato.md), los tres endpoints que se concilian son
`GET /membresias`, `GET /reportes/resumen?mes=2026-10` y
`GET /reportes/por-categoria?mes=2026-10`:

1. La suma de `total` por categoría debe ser igual a `resumen.gasto_variable`.
2. La suma de las membresías mensualizadas debe ser igual a `resumen.gasto_fijo`:
   mensual = costo; anual = costo / 12. Se suma antes de redondear a dos decimales.
3. `gasto_variable + gasto_fijo` debe ser igual a `resumen.total`.

El total por categoría contiene exclusivamente gastos variables. Las membresías
no tienen categoría en el modelo y se contabilizan en el componente fijo del
resumen. Por eso, con membresías, la suma por categoría coincide con el variable,
y se agrega el fijo para llegar al total general. El catálogo es una cuarta
consulta de referencia: no tiene un total personal que deba sumarse al resumen.

`fecha_cobro` es la próxima fecha de cobro; conforme al contrato, el fijo
mensualiza todas las membresías, también si esa fecha está fuera del mes consultado.

## Datos conocidos y suma manual

Mes fijo **2026-10**; no depende del mes del reloj. Los IDs de categorías y
servicios se descubren mediante la API, sin asumir valores de autoincremento.

| Usuario A: gasto | Fecha | Categoría | Importe incluido en octubre |
|---|---|---|---:|
| Gasto 1 | 2026-10-01 | Comida | 350.00 |
| Gasto 2 | 2026-10-31 | Comida | 250.00 |
| Gasto 3 | 2026-10-15 | Transporte | 300.00 |
| Gasto 4 | 2026-10-20 | Entretenimiento | 100.00 |
| Control de mes anterior: 777.00 | 2026-09-30 | Comida | 0.00 |
| Control de mes siguiente: 888.00 | 2026-11-01 | Comida | 0.00 |

| Usuario A: membresía | Frecuencia | Costo | Aporte mensual |
|---|---|---:|---:|
| Gimnasio | mensual | 200.00 | 200.00 |
| Anual, próxima fecha 2027-01-01 | anual | 1200.00 | 100.00 |

Suma manual: variable = **350 + 250 + 300 + 100 = 1000.00**;
fijo = **200 + 1200/12 = 300.00**; total = **1300.00**.
Resultado esperado y obtenido:

| Endpoint | Observado |
|---|---|
| `/membresias` | Dos registros: mensual 200 y anual 1200; mensualizado 300 |
| `/reportes/resumen?mes=2026-10` | `gasto_variable: 1000`, `gasto_fijo: 300`, `total: 1300` |
| `/reportes/por-categoria?mes=2026-10` | Comida 600 (60 %), Transporte 300 (30 %), Entretenimiento 100 (10 %); suma 1000 |

Evidencia directa en ambas iteraciones: `CONSISTENCIA-ANUAL-FIJO`,
`CONSISTENCIA-ANUAL-RESUMEN` y `CP-RF8-01 / CONSISTENCIA-ANUAL-CATEGORIAS`.

El usuario B tiene gasto 999 y membresía mensual 750: variable **999**, fijo
**750**, total **1749** en la colección. Al agregar B, los tres resultados de A
se conservan. En septiembre y noviembre A tiene variables 777 y 888,
respectivamente, sin contaminar octubre.

## Casos y resultados

Se conservaron los ocho IDs del [plan de pruebas](../plan-de-pruebas.md).
Los pasos de pantallas se verificaron mediante su equivalente HTTP.

| Caso | Verificación y resultado obtenido | Resultado API |
|---|---|---|
| CP-RF5-01 | Crear Netflix 199 mensual y listar los cuatro datos capturados | Pasa |
| CP-RF5-02 | Editar a 219, comprobar persistencia y fijo 219; eliminar y comprobar lista vacía/fijo 0 | Pasa |
| CP-RF5-03 | Nombre vacío: 400 `NOMBRE_INVALIDO`, sin persistir | Pasa |
| CP-RF5-04 | Costo `abc`: 400 `COSTO_INVALIDO`, sin persistir | Pasa |
| CP-RF6-01 | Gastos 350 + 150 y membresía 300: variable 500, fijo 300, total 800 | Pasa |
| CP-RF6-02 | Sin movimientos: variable 0, fijo 0 y total 0 | Pasa |
| CP-RF8-01 | Comida 600, Transporte 300, Entretenimiento 100: proporciones 60/30/10 y suma variable 1000 | Pasa |
| CP-RF8-02 | Sin gastos: HTTP 200, arreglo vacío `[]` | Pasa |
| RF5-CATALOGO-* | Netflix del catálogo aporta nombre y costo 199; personalizar a 219 actualiza el fijo y conserva el catálogo | Pasa |
| CONSISTENCIA-ANUAL-* | Tres endpoints concilian variable 1000, fijo 300, total 1300 | Pasa |
| CONSISTENCIA-DECIMALES-* | Variables 0.10 + 0.20 = 0.30; dos anuales de 100 suman fijo 16.67; total 16.97 | Pasa |
| RF8-REDONDEO-100 | Tres importes iguales: porcentajes 34/33/33, suma 100; desempate por ID ascendente | Pasa |
| AISLAMIENTO-A/B-* | Listas y reportes propios en ambos sentidos, incluso enviando `usuario_id` ajeno; catálogo global intacto | Pasa |
| AISLAMIENTO-PUT/DELETE-AJENA | 404 `MEMBRESIA_NO_ENCONTRADA`; datos y totales del propietario intactos | Pasa |
| AUTH-* | Token ausente e inválido en cada ruta protegida del alcance: 401 `NO_AUTORIZADO`, sin modificar membresías | Pasa |
| MES-INVALIDO-* | Ambos reportes rechazan mes ausente, vacío, 2026-13, 2026-1 y 2026-10-01: 400 `MES_INVALIDO` | Pasa |
| CAMBIOS-* | Cambiar anual 1200→2400 y gasto 350→400: variable 1050, fijo 400, total 1450; borrar devuelve ceros | Pasa |
| FINAL-* | Cuentas A/B sin gastos de ningún mes ni membresías; resumen en ceros | Pasa |

Las rutas de autenticación comprobadas son GET catálogo, GET/POST membresías,
PUT/DELETE membresías por ID y GET de los dos reportes: siete combinaciones de
método/ruta con token ausente y con token inválido. El catálogo es compartido
por diseño; las membresías personalizadas de B no aparecen como servicios.

La colección ejecuta 135 peticiones por iteración, dos iteraciones sin solicitudes
auxiliares: 270 casos y 830 aserciones. Todas las carpetas se ejecutan completas;
la evidencia incluye las respuestas observadas, no únicamente un marcador de éxito.

## Reproducción

Requisitos: Node 22, dependencias del lockfile (`npm ci` en `backend`) y
PostgreSQL accesible con permiso `CREATEDB`. Configurar `DB_HOST`, `DB_PORT`,
`DB_USER` y `DB_PASSWORD` en `backend/.env`; `TEST_ADMIN_DATABASE` o
`QA_ADMIN_DATABASE` permiten cambiar la conexión administrativa (por defecto `postgres`).

Desde `backend`:

```powershell
npm run test:membresias-reportes
npm run qa:membresias-reportes
npm test
npm run lint
```

`qa:membresias-reportes` ejecuta la suite dedicada y la colección JSON importable
con Newman sobre otra base temporal. Exige **100 %** de casos y aserciones,
cero errores de ejecución y limpieza completa. Salida: 0 aprobado, 1 fallos,
2 ejecución incompleta. Los hashes se calculan después de ejecutar los archivos.

Para Postman manual, importar la colección dedicada sin ambiente, ajustar
`baseUrl` a un servidor QA y ejecutar todas las carpetas en orden, dos iteraciones.
El alta genera cuentas nuevas y la limpieza elimina gastos y membresías creados.
La API no permite borrar cuentas; en ejecución manual las cuentas permanecen.
El runner elimina la base completa que él mismo creó.

Si cambia la colección, editar `backend/qa/coleccion-membresias-reportes.cjs`,
ejecutar `npm run qa:membresias-reportes:coleccion` y repetir QA para actualizar
la evidencia. El runner no regenera silenciosamente la colección.

## Revisión independiente de Joshua

Joshua debe elegir **dos casos al azar**, repetirlos con el mismo código y
colección y registrar que obtiene los mismos estados, importes y errores.
Puede elegir dos peticiones de verificación con el siguiente comando desde
`backend`; se excluyen preparación y limpieza de la selección:

```powershell
$qaPublicado = Get-Content ../docs/postman/ejecucion-membresias-reportes.json -Raw | ConvertFrom-Json
$qaElegidos = $qaPublicado.executions |
  Where-Object { $_.iteration -eq 1 -and $_.name -match '^(CP-RF|CONSISTENCIA-|AISLAMIENTO-|AUTH-|MES-INVALIDO-)' } |
  Get-Random -Count 2
$qaElegidos | Select-Object name, status, response
$env:QA_OUTPUT_DIR = Join-Path $env:TEMP 'billo-membresias-reportes-joshua'
npm run qa:membresias-reportes
$qaExit = $LASTEXITCODE
$qaRepetido = Get-Content (Join-Path $env:QA_OUTPUT_DIR 'postman/ejecucion-membresias-reportes.json') -Raw | ConvertFrom-Json
Remove-Item Env:QA_OUTPUT_DIR
$qaRepetido.executions | Where-Object { $_.iteration -eq 1 -and $_.name -in $qaElegidos.name } |
  Select-Object name, status, passed, response
```

Se ejecuta toda la colección para preparar las precondiciones de los dos casos
elegidos. Comparar sus respuestas con las publicadas, sus aserciones y los hashes
de archivos. Los IDs, `dias_para_cobro` si cambia el día, marcas de tiempo y nombre
de base pueden variar; importes, proporciones, códigos HTTP/error y resultados
de aislamiento deben coincidir. `$qaExit` debe ser 0; la BD debe quedar eliminada.

| Caso elegido | Fecha / entorno / hashes | Esperado y obtenido | Confirmación de Joshua |
|---|---|---|---|
| Pendiente de selección aleatoria | Pendiente | Pendiente | Pendiente |
| Pendiente de selección aleatoria | Pendiente | Pendiente | Pendiente |

La revisión de Joshua y las pruebas de interfaz Android (incluido el mensaje sin
datos y la gráfica visible) están pendientes. Esta ejecución no sustituye esos
pasos ni cierra por sí sola las historias dependientes.
