# QA de entrega — RF7, RF9 y RF10 (APK HU-53)

## Dictamen al 2026-11-12

**RF7, RF9 y RF10: Aprobados**

Se ejecutaron las suites existentes: **404/404 pruebas de backend y 366/366 de
lógica móvil pasan**, sin fallas, cancelaciones ni omisiones. 

Una comprobación HTTP adicional de CP-RF9-01 **falla en alcance API**:
el alta de la categoría Mascotas devuelve 404 y no crea datos. Se registró
[ENT-RF9-01](bugs/ENT-RF9-01-alta-categoria-admin.md), severidad Alta propuesta.
Esta reproducción se informa aparte de las 770 pruebas existentes que pasan.

## Ficha y evidencias

| Campo | Valor |
|---|---|
| Fecha / zona | 2026-11-12 / America/Mexico_City |
| Ejecutor de automatización | Codex; revisión y ejecución física de QA pendientes |
| Rama / commit de las pruebas | `develop` / `0b84c0bb8b02fd850930abd8b446858e25227235` |
| Ambiente | Windows, PowerShell, Node v22.15.0, npm 10.9.2 |
| Backend probado | Express real y PostgreSQL temporal con las migraciones del checkout; base creada y eliminada por la suite |
| App local | `mobile/package.json`: 1.0.0, Expo `~58.0.25`; no identifica el SDK del APK publicado |
| APK de referencia | [HU-53, release v1.0.0-apk](https://github.com/JoshuaJose10/BILLO/releases/download/v1.0.0-apk/application-56bcd3ef-2c7e-42a5-b9c6-09cb1fc4950e.apk), enlace documentado en `mobile/README.md`; no descargado ni instalado en esta corrida |
| SHA-256 / build / commit del APK | Pendientes de obtener y verificar; no inferirlos del checkout |
| Modelo / Android / versión instalada | No disponibles: sin teléfono |
| API configurada en el APK | Según HU-53: `https://billo-api-v30t.onrender.com`; no verificada desde el APK |
| Responsable de QA según README | Luis Dorian Ferreira Calderón; ejecución física por coordinar |

| Evidencia real | Alcance |
|---|---|
| [backend.tap](entrega-rf7-rf9-rf10-evidencias/backend.tap) | Salida completa de `npm test` en backend, 404 Pasa |
| [mobile.tap](entrega-rf7-rf9-rf10-evidencias/mobile.tap) | Salida completa de `npm test` en mobile, 366 Pasa |
| [resumen.json](entrega-rf7-rf9-rf10-evidencias/resumen.json) | Comandos, commit, ambiente y conteos de esta corrida |
| [entorno-android.txt](entrega-rf7-rf9-rf10-evidencias/entorno-android.txt) | `adb devices -l`: lista vacía |
| [CP-RF9-01-api.json](entrega-rf7-rf9-rf10-evidencias/CP-RF9-01-api.json) | Comprobación HTTP adicional: alta de categoría como admin devuelve 404 y no persiste |

Repetir con `cd backend` → `npm test`, y después `cd ../mobile` → `npm test`.
Requiere dependencias instaladas y PostgreSQL configurado según
[backend/README.md](../../backend/README.md). La suite usa una BD temporal;
no ejecuta estos casos contra la base compartida de Render. En RF7 sustituye
Expo por un servidor HTTP local o un mock: no envía push reales.

## Resultados de RF7, RF9 y RF10

Los pasos y precondiciones están en el [plan de pruebas](../plan-de-pruebas.md).
**B-01** significa que falta un Android físico y, por ello, no hay evidencia de
ejecución del APK. Los nombres de captura siguientes son destinos previstos;
esos archivos aún no existen. Al ejecutar, reemplazar Bloqueado por Pasa/Falla,
añadir fecha, ejecutor y enlace real al archivo; cada Falla debe enlazar un bug.

| Caso | Escenario | Resultado APK | Evidencia pendiente / bloqueo |
|---|---|---|---|
| CP-RF7-01 | Aviso a 3 días | Bloqueado | B-01; `CP-RF7-01.png`, resumen del job y marca en BD |
| CP-RF7-02 | No avisar a 10 días | Bloqueado | B-01; `CP-RF7-02.png`, job con cero envíos y marca sin cambios |
| CP-RF7-03 | Membresía eliminada | Bloqueado | B-01; ausencia en BD y job sin envío para esa membresía |
| CP-RF7-04 | Aviso a 2 días y apertura | Bloqueado | B-01; `CP-RF7-04.mp4`, job y marca D |
| CP-RF7-05 | Repetir el mismo día | Bloqueado | B-01; `CP-RF7-05.mp4`, resúmenes de ambas ejecuciones y BD |
| CP-RF7-06 | Sin token push; control con token | Bloqueado | B-01; `CP-RF7-06.mp4`, estado sanitizado de A/B y job |
| CP-RF9-01 | Admin agrega categoría Mascotas | Bloqueado | B-01; `CP-RF9-01.mp4`; comprobación API falla: ENT-RF9-01 |
| CP-RF9-02 | Usuario normal sin permisos de escritura | Bloqueado | B-01; `CP-RF9-02.mp4`, 403 de POST/PUT/DELETE y catálogo intacto |
| CP-RF9-03 | Admin crea, edita y elimina servicio libre | Bloqueado | B-01; `CP-RF9-03.mp4`, persistencia y consulta desde usuario normal |
| CP-RF9-04 | No eliminar servicio en uso | Bloqueado | B-01; `CP-RF9-04.mp4`, 409 y datos conservados |
| CP-RF10-01 | Explorar con datos de ejemplo | Bloqueado | B-01; `CP-RF10-01.mp4` |
| CP-RF10-02 | Intentar guardar, editar o eliminar | Bloqueado | B-01; `CP-RF10-02.mp4`, variantes y ausencia de escrituras |
| CP-RF10-03 | Encontrar acceso en máximo 2 toques | Bloqueado | B-01; `CP-RF10-03.mp4`, desde Login |
| CP-RF10-04 | Entrar y explorar sin red | Bloqueado | B-01; `CP-RF10-04.mp4`, conectividad apagada y tráfico de Billo |
| CP-RF10-05 | Crear cuenta y guardar datos reales | Bloqueado | B-01; `CP-RF10-05.mp4`, cuenta sin demo y persistencia tras reingresar |

**Conteo APK objetivo:** 15 casos; Pasa 0, Falla 0, Bloqueado 15.

### Evidencia automática relacionada

Estos resultados corresponden solo a las aserciones descritas, no a los casos
completos de la tabla anterior.

| Casos relacionados | Comprobación ejecutada | Resultado | Evidencia |
|---|---|---|---|
| CP-RF9-01 | Admin intenta alta de categoría; devuelve 404 y no crea Mascotas | **Falla** | `CP-RF9-01-api.json`, bug ENT-RF9-01; no forma parte de las suites existentes |
| CP-RF7-02 | A 10 días: cero llamadas a Expo y marca nula | Pasa | `backend.tap`: «una membresía a 10 días no genera aviso» |
| CP-RF7-04/05 | A 2 días: payload, marca en BD y segunda ejecución sin otro envío | Pasa | `backend.tap`: «una membresía a 2 días genera un solo aviso al día y guarda ultima_notificacion» |
| CP-RF7-06 | Cuenta sin token y falla de Expo no detienen el proceso de las demás | Pasa | `backend.tap`: «si un usuario no tiene token o Expo falla…» |
| CP-RF9-02 | Usuario normal: 403 en POST/PUT/DELETE; catálogo conservado | Pasa | `backend.tap`, suite «Administración del catálogo (RF9)» |
| CP-RF9-03 | Admin: alta, edición y baja de servicio sin uso | Pasa | Misma suite, subtests «admin agrega», «admin edita» y «admin elimina» |
| CP-RF9-04 | Servicio referenciado: 409 `SERVICIO_EN_USO` y servicio conservado | Pasa | Misma suite: «eliminar un servicio en uso por membresías…»; UI y totales pendientes |
| CP-RF10-01/02/04 | Demo local coherente, escrituras rechazadas sin cambiar datos; guardia impide llamadas HTTP | Pasa | `mobile.tap`, suites «datos de ejemplo», «responderEjemplo» y «apiFetch en modo exploración»; no verifica arranque nativo sin red |
| CP-RF10-05 | Al desactivar visitante, `apiFetch` vuelve a llamar a la API | Pasa | `mobile.tap`: «al salir del modo vuelve a llamar a la API»; registro desde la pantalla y descarte visual de demo pendientes |

**Defecto de cobertura RF9:** CP-RF9-01 exige crear una categoría, mientras
que `AdminCatalogoScreen` administra servicios y `categorias.routes.js` solo
expone GET. Los tests de CRUD de servicios no cubren ese caso. La reproducción
HTTP adicional confirmó 404 `RUTA_NO_ENCONTRADA` y lista intacta; se registró
ENT-RF9-01. Falta contrastarlo con el APK y resolver el alcance con Joshua;
no se modifica el caso para hacerlo pasar ni se declara un fallo del APK sin ejecutarlo.

## Regresión RF1–RF6 y RF8

Resultado API equivalente separado del resultado de pantalla. Para cada fila,
la evidencia automática está en [backend.tap](entrega-rf7-rf9-rf10-evidencias/backend.tap),
en el módulo indicado. En Android guardar `CP-RFx-nn.mp4` o capturas suficientes
para comprobar cada paso. B-01 aplica a las 24 filas.

| Caso | Comprobación | Resultado API | Módulo de `backend/test/suites/` | Resultado APK / evidencia física |
|---|---|---|---|---|
| CP-RF1-01 | Crear cuenta | Pasa | `auth.cjs` | Bloqueado / B-01 |
| CP-RF1-02 | Iniciar sesión | Pasa | `auth.cjs` | Bloqueado / B-01 |
| CP-RF1-03 | Correo duplicado | Pasa | `auth.cjs` | Bloqueado / B-01 |
| CP-RF1-04 | Contraseña incorrecta | Pasa | `auth.cjs` | Bloqueado / B-01 |
| CP-RF2-01 | Guardar gasto con cuatro datos | Pasa | `gastos.cjs` | Bloqueado / B-01 |
| CP-RF2-02 | Rechazar monto de texto | Pasa | `gastos.cjs` | Bloqueado / B-01 |
| CP-RF2-03 | Rechazar categoría ausente | Pasa | `gastos.cjs` | Bloqueado / B-01 |
| CP-RF3-01 | Presupuesto de 2000 | Pasa | `presupuestos.cjs` | Bloqueado / B-01 |
| CP-RF3-02 | Rechazar presupuesto negativo | Pasa | `presupuestos.cjs` | Bloqueado / B-01 |
| CP-RF4-01 | Aviso al 80 % | Pasa | `presupuestos.cjs` | Bloqueado / B-01 |
| CP-RF4-02 | Aviso al superar límite | Pasa | `presupuestos.cjs` | Bloqueado / B-01 |
| CP-RF4-03 | Sin aviso al 15 % | Pasa | `presupuestos.cjs` | Bloqueado / B-01 |
| CP-RF4-04 | 799.90: estado ok | Pasa | `presupuestos.cjs` | Bloqueado / B-01 |
| CP-RF4-05 | 800: alerta | Pasa | `presupuestos.cjs` | Bloqueado / B-01 |
| CP-RF4-06 | 1000: alerta, sin excedido | Pasa | `presupuestos.cjs` | Bloqueado / B-01 |
| CP-RF4-07 | 1000.10: excedido | Pasa | `presupuestos.cjs` | Bloqueado / B-01 |
| CP-RF5-01 | Alta y consulta de membresía | Pasa | `membresias-reportes.cjs` | Bloqueado / B-01 |
| CP-RF5-02 | Edición a 219 y eliminación | Pasa | `membresias-reportes.cjs` | Bloqueado / B-01 |
| CP-RF5-03 | Rechazar nombre vacío | Pasa | `membresias-reportes.cjs` | Bloqueado / B-01 |
| CP-RF5-04 | Rechazar costo de texto | Pasa | `membresias-reportes.cjs` | Bloqueado / B-01 |
| CP-RF6-01 | Variable 500, fijo 300, total 800 | Pasa | `membresias-reportes.cjs` | Bloqueado / B-01 |
| CP-RF6-02 | Sin datos: ceros | Pasa | `membresias-reportes.cjs` | Bloqueado / B-01 |
| CP-RF8-01 | Datos por categoría 60/30/10 | Pasa | `membresias-reportes.cjs` | Bloqueado / B-01 |
| CP-RF8-02 | Sin gastos: arreglo vacío | Pasa | `membresias-reportes.cjs` | Bloqueado / B-01 |

**Regresión:** 24 casos equivalentes pasan en API; 24 casos del APK bloqueados.
La representación de avisos y gráficas, el teclado, los gestos y la persistencia
al cerrar/reabrir la app requieren teléfono. La aprobación histórica de Sprint 2
se conserva como antecedente, no se presenta como una nueva ejecución.

## Bugs, bloqueos y aviso el mismo día

Las suites existentes no fallaron; la comprobación adicional de alta de
categoría sí falló y tiene ficha propia. No se abre un bug por no tener
teléfono. Ante cada falla física, usar la [plantilla](../plantilla-reporte-bug.md)
en `docs/qa/bugs/`, con caso, pasos, resultado esperado/obtenido, ambiente,
severidad, evidencia sanitizada y reprueba. Registrar a continuación el aviso
del mismo día local; no asignar responsable ni fecha de corrección sin acuerdo.

| Registro | Estado / efecto | Responsable y comunicación |
|---|---|---|
| B-01: sin Android físico | Abierto; impide las 39 ejecuciones físicas | Coordinar con QA/líder; sin asignación acordada |
| [HU68-BUG-01](bugs/HU68-BUG-01-token-cuenta-eliminada.md): JWT de cuenta eliminada conserva acceso | Ficha histórica abierta, severidad Alta; afecta escritura admin en catálogo. No reproducido ni cerrado en esta corrida; exige reprueba antes de aprobar RF9 | Responsable por asignar en la ficha; aviso externo no acreditado |
| [ENT-RF9-01](bugs/ENT-RF9-01-alta-categoria-admin.md): alta de categoría inexistente | Abierto; Alta propuesta; 404 reproducido en API aislada; APK pendiente | Por asignar; contrastar alcance con Joshua; aviso pendiente |
| Comunicación externa de esta revisión | **Pendiente**; búsqueda de integración ClickUp sin resultados disponibles | No se envió aviso ni se creó una tarea externa; faltan canal accesible y destinatario confirmado |

Texto preparado para QA/líder, **no enviado**:

> Revisión 2026-11-12: RF7/RF9/RF10 no aprobados para entrega por falta de
> ejecución en Android físico del APK HU-53. Backend 404/404 y lógica móvil
> 366/366 pasan. El reporte incluye 15 casos objetivo y 24 de regresión por
> ejecutar. Defecto nuevo ENT-RF9-01: alta de categoría como admin devuelve 404
> (Alta propuesta; evidencia HTTP adjunta). Revisar también
> HU68-BUG-01 (Alta, ya registrado). Coordinar dispositivo, ejecución y reprueba;
> registrar en ClickUp responsable acordado, enlace de evidencia y dictamen.

Al enviar: completar fecha/hora local, destinatario, canal y enlace del mensaje
o tarea. Si se envía otro día, registrar la fecha real; no acreditarlo como aviso
del 2026-11-12. El texto preparado no satisface el criterio de notificación.

## Decisión por requisito y cierre

| RF | Decisión para HU-53 | Fundamento | Lista de requisitos |
|---|---|---|---|
| RF7 | **NO APROBADO** | 6 casos físicos bloqueados; falta recepción real, permiso/token y evidencia del job correlacionada | Sin marcar |
| RF9 | **NO APROBADO** | 4 casos físicos bloqueados; ENT-RF9-01 falla en API; resolver alcance y corregir/reprobar defectos Altos | Sin marcar |
| RF10 | **NO APROBADO** | 5 casos físicos bloqueados; falta arranque sin red, acciones de pantalla y registro desde visitante | Sin marcar |

La [lista de requisitos](../lista-requisitos.md) refleja estas decisiones. Para
aprobar, ejecutar los 39 casos físicos, completar datos del APK/teléfono,
adjuntar evidencias reales y fichas de cada fallo, avisar al responsable el mismo
día y aplicar los [criterios de calidad](../criterios-calidad.md). QA debe firmar
el dictamen de cada RF y marcarlo en la lista únicamente cuando corresponda.
Nombre, fecha y aprobación de QA/PO: **pendientes**.
