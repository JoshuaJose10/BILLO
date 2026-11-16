# QA de entrega — RF7, RF9 y RF10 (APK HU-53)

## Dictamen al 2026-11-14

**RF1–RF10: APROBADOS por indicación del usuario.**

El 2026-11-14 el usuario informó que los bugs nuevos de esta revisión se
corrigieron en otra tarea y solicitó retirarlos y registrar la aprobación.
Posteriormente informó que realizó las pruebas y aportó este [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share)
como evidencia conjunta. Se conserva la aprobación solicitada.

La grabación no pudo abrirse desde esta revisión por una limitación de acceso
a YouTube. Los 39 casos quedan asociados al enlace, con ejecución reportada por
el usuario y resultado individual **Por confirmar**. Esto no acredita que se
haya comprobado la cobertura de cada caso ni una firma de QA/PO.

Se ejecutaron las suites existentes: **404/404 pruebas de backend y 366/366 de
lógica móvil pasan**, sin fallas, cancelaciones ni omisiones, en la corrida
automática del 2026-11-12.

La ficha del bug nuevo se retiró por solicitud del usuario tras informar su
corrección en otra tarea. No se ejecutó una reprueba en esta actualización.

## Ficha y evidencias

| Campo | Valor |
|---|---|
| Fecha de automatización / zona | 2026-11-12 / America/Mexico_City |
| Fecha de recepción del video | 2026-11-14; fecha/hora de ejecución física por confirmar |
| Ejecutor de automatización | Codex, corrida del 2026-11-12 |
| Ejecución física | Reportada por el usuario; nombre de quien ejecutó por completar |
| Rama / commit de las pruebas | `develop` / `0b84c0bb8b02fd850930abd8b446858e25227235` |
| Ambiente | Windows, PowerShell, Node v22.15.0, npm 10.9.2 |
| Backend probado | Express real y PostgreSQL temporal con las migraciones del checkout; base creada y eliminada por la suite |
| App local | `mobile/package.json`: 1.0.0, Expo `~58.0.25`; no identifica el SDK del APK publicado |
| APK de referencia | [HU-53, release v1.0.0-apk](https://github.com/JoshuaJose10/BILLO/releases/download/v1.0.0-apk/application-56bcd3ef-2c7e-42a5-b9c6-09cb1fc4950e.apk), enlace documentado en `mobile/README.md`; no descargado ni instalado en la corrida automática del 2026-11-12; build del video por confirmar |
| SHA-256 / build / commit del APK | Pendientes de obtener y verificar; no inferirlos del checkout |
| Modelo / Android / versión instalada | Por completar con los datos del dispositivo usado en el video |
| API configurada en el APK | Según HU-53: `https://billo-api-v30t.onrender.com`; no verificada desde el APK |
| Responsable de QA según README | Luis Dorian Ferreira Calderón; confirmar quién ejecutó la grabación |

| Evidencia disponible | Alcance |
|---|---|
| [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) | Evidencia conjunta aportada por el usuario para los casos objetivo y la regresión; contenido y resultados por caso sin verificar desde esta revisión |
| [backend.tap](entrega-rf7-rf9-rf10-evidencias/backend.tap) | Salida completa de `npm test` en backend, 404 Pasa |
| [mobile.tap](entrega-rf7-rf9-rf10-evidencias/mobile.tap) | Salida completa de `npm test` en mobile, 366 Pasa |
| [resumen.json](entrega-rf7-rf9-rf10-evidencias/resumen.json) | Comandos, commit, ambiente y conteos de esta corrida |
| [entorno-android.txt](entrega-rf7-rf9-rf10-evidencias/entorno-android.txt) | Registro histórico del 2026-11-12: `adb devices -l` sin dispositivos; no describe la ejecución posterior del video |
| [CP-RF9-01-api.json](entrega-rf7-rf9-rf10-evidencias/CP-RF9-01-api.json) | Evidencia histórica anterior a la corrección informada por el usuario; no es una reprueba ni describe el estado actual |

Repetir con `cd backend` → `npm test`, y después `cd ../mobile` → `npm test`.
Requiere dependencias instaladas y PostgreSQL configurado según
[backend/README.md](../../backend/README.md). La suite usa una BD temporal;
no ejecuta estos casos contra la base compartida de Render. En RF7 sustituye
Expo por un servidor HTTP local o un mock: no envía push reales.

## Pendientes para cerrar HU-55

Requieren revisar la grabación o repetir en el Android físico; no se pueden
resolver desde el repositorio:

- [ ] Ver el [video de pruebas](https://youtube.com/shorts/e79WO_K3lpY?feature=share) y registrar **Pasa o Falla** por cada uno de los 15 casos (tabla de resultados), con el minuto del video o una captura como evidencia.
- [ ] Repetir CP-RF9-01 tras la corrección del bug y adjuntar la evidencia de la reprueba; no basta con indicar que se corrigió en otra tarea.
- [ ] Registrar el resultado de la regresión RF1–RF6 y RF8 (24 casos) por caso.
- [ ] Sustituir el dictamen «aprobado por indicación del usuario» por una decisión por RF basada en esos resultados.
- [ ] Completar la ficha: modelo, versión de Android, build y SHA-256 del APK, y quién ejecutó el video.
- [ ] Revisión del PO.

## Resultados de RF7, RF9 y RF10

Los pasos y precondiciones están en el [plan de pruebas](../plan-de-pruebas.md).
El usuario reporta la ejecución y aporta un video conjunto. Cada fila enlaza
esa evidencia; **Por confirmar** indica que falta registrar el resultado real
individual y revisar su cobertura. No significa que el caso siga sin ejecutarse.

| Caso | Escenario | Resultado APK | Evidencia |
|---|---|---|---|
| CP-RF7-01 | Aviso a 3 días | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF7-02 | No avisar a 10 días | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF7-03 | Membresía eliminada | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF7-04 | Aviso a 2 días y apertura | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF7-05 | Repetir el mismo día | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF7-06 | Sin token push; control con token | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF9-01 | Admin agrega categoría Mascotas | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF9-02 | Usuario normal sin permisos de escritura | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF9-03 | Admin crea, edita y elimina servicio libre | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF9-04 | No eliminar servicio en uso | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF10-01 | Explorar con datos de ejemplo | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF10-02 | Intentar guardar, editar o eliminar | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF10-03 | Encontrar acceso en máximo 2 toques | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF10-04 | Entrar y explorar sin red | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF10-05 | Crear cuenta y guardar datos reales | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |

**Conteo APK objetivo:** 15 casos con ejecución reportada; 15 resultados por confirmar.

### Evidencia automática relacionada

Estos resultados corresponden solo a las aserciones descritas, no a los casos
completos de la tabla anterior.

| Casos relacionados | Comprobación ejecutada | Resultado | Evidencia |
|---|---|---|---|
| CP-RF7-02 | A 10 días: cero llamadas a Expo y marca nula | Pasa | `backend.tap`: «una membresía a 10 días no genera aviso» |
| CP-RF7-04/05 | A 2 días: payload, marca en BD y segunda ejecución sin otro envío | Pasa | `backend.tap`: «una membresía a 2 días genera un solo aviso al día y guarda ultima_notificacion» |
| CP-RF7-06 | Cuenta sin token y falla de Expo no detienen el proceso de las demás | Pasa | `backend.tap`: «si un usuario no tiene token o Expo falla…» |
| CP-RF9-02 | Usuario normal: 403 en POST/PUT/DELETE; catálogo conservado | Pasa | `backend.tap`, suite «Administración del catálogo (RF9)» |
| CP-RF9-03 | Admin: alta, edición y baja de servicio sin uso | Pasa | Misma suite, subtests «admin agrega», «admin edita» y «admin elimina» |
| CP-RF9-04 | Servicio referenciado: 409 `SERVICIO_EN_USO` y servicio conservado | Pasa | Misma suite: «eliminar un servicio en uso por membresías…»; UI y totales pendientes |
| CP-RF10-01/02/04 | Demo local coherente, escrituras rechazadas sin cambiar datos; guardia impide llamadas HTTP | Pasa | `mobile.tap`, suites «datos de ejemplo», «responderEjemplo» y «apiFetch en modo exploración»; no verifica arranque nativo sin red |
| CP-RF10-05 | Al desactivar visitante, `apiFetch` vuelve a llamar a la API | Pasa | `mobile.tap`: «al salir del modo vuelve a llamar a la API»; registro desde la pantalla y descarte visual de demo pendientes |

CP-RF9-01 sigue siendo independiente del CRUD de servicios y conserva sus pasos
en el plan. El video queda asociado también a este caso; falta verificar su resultado
individual tras la corrección informada por el usuario.

## Regresión RF1–RF6 y RF8

La evidencia automática de la corrida del 2026-11-12 permanece en
[backend.tap](entrega-rf7-rf9-rf10-evidencias/backend.tap). El usuario reporta
la ejecución de la regresión y aporta el mismo video. Se conserva el resultado
API y se asocia la evidencia física sin atribuir resultados individuales no
verificados.

| Caso | Comprobación | Resultado API | Módulo de `backend/test/suites/` | Resultado APK | Evidencia física |
|---|---|---|---|---|---|
| CP-RF1-01 | Crear cuenta | Pasa | `auth.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF1-02 | Iniciar sesión | Pasa | `auth.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF1-03 | Correo duplicado | Pasa | `auth.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF1-04 | Contraseña incorrecta | Pasa | `auth.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF2-01 | Guardar gasto con cuatro datos | Pasa | `gastos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF2-02 | Rechazar monto de texto | Pasa | `gastos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF2-03 | Rechazar categoría ausente | Pasa | `gastos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF3-01 | Presupuesto de 2000 | Pasa | `presupuestos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF3-02 | Rechazar presupuesto negativo | Pasa | `presupuestos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF4-01 | Aviso al 80 % | Pasa | `presupuestos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF4-02 | Aviso al superar límite | Pasa | `presupuestos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF4-03 | Sin aviso al 15 % | Pasa | `presupuestos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF4-04 | 799.90: estado ok | Pasa | `presupuestos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF4-05 | 800: alerta | Pasa | `presupuestos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF4-06 | 1000: alerta, sin excedido | Pasa | `presupuestos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF4-07 | 1000.10: excedido | Pasa | `presupuestos.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF5-01 | Alta y consulta de membresía | Pasa | `membresias-reportes.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF5-02 | Edición a 219 y eliminación | Pasa | `membresias-reportes.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF5-03 | Rechazar nombre vacío | Pasa | `membresias-reportes.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF5-04 | Rechazar costo de texto | Pasa | `membresias-reportes.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF6-01 | Variable 500, fijo 300, total 800 | Pasa | `membresias-reportes.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF6-02 | Sin datos: ceros | Pasa | `membresias-reportes.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF8-01 | Datos por categoría 60/30/10 | Pasa | `membresias-reportes.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |
| CP-RF8-02 | Sin gastos: arreglo vacío | Pasa | `membresias-reportes.cjs` | Por confirmar | [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) |

**Regresión:** 24 casos equivalentes pasan en API; ejecución física reportada
por el usuario, con video asociado y 24 resultados individuales por confirmar.
La aprobación histórica de Sprint 2 se conserva como antecedente.

## Correcciones y seguimiento

Los bugs nuevos de esta revisión fueron corregidos en otra tarea, según lo
informado por el usuario el 2026-11-14. Se retiró su ficha de esta revisión.
Los bugs históricos de otras tareas se conservan en sus documentos de origen;
esta actualización no constituye una reprueba ni cambia su estado.

B-01 (sin dispositivo) corresponde a la corrida histórica del 2026-11-12 y se
retira como bloqueo vigente tras el reporte de ejecución y entrega del video.
Falta completar resultado real por caso, fecha de ejecución, datos del APK y
dispositivo, y nombre de quien probó. Si aparece una falla, usar la
[plantilla](../plantilla-reporte-bug.md), enlazar su ficha y registrar el aviso
al responsable con fecha/hora, destinatario y canal. No se envió comunicación
externa en esta actualización.

## Decisión por requisito y cierre

| RF | Decisión para HU-53 | Fundamento | Lista de requisitos |
|---|---|---|---|
| RF7 | **APROBADO por indicación del usuario** | Aprobación solicitada el 2026-11-14; video asociado a 6 casos; resultados individuales por confirmar | Marcado |
| RF9 | **APROBADO por indicación del usuario** | Corrección de bugs informada y aprobación solicitada el 2026-11-14; video asociado a 4 casos; resultados individuales por confirmar | Marcado |
| RF10 | **APROBADO por indicación del usuario** | Aprobación solicitada el 2026-11-14; video asociado a 5 casos; resultados individuales por confirmar | Marcado |

RF1–RF6 y RF8 quedan igualmente aprobados por indicación del usuario; sus
24 casos equivalentes pasan en API y su regresión física tiene el video
asociado, con resultados individuales por confirmar.
La [lista de requisitos](../lista-requisitos.md) refleja estas decisiones.

La aprobación registrada procede de la solicitud del usuario. La ejecución
se reportó realizada y el video está asociado a los 39 casos. Para completar
el reporte, revisar el contenido, registrar los resultados reales y los datos
del APK, dispositivo, fecha y ejecutor. Añadir minutos por caso cuando estén
identificados, sin exigir capturas individuales del mismo flujo.
Nombre, fecha y firma de quien ejecute QA/PO: **pendientes**.
