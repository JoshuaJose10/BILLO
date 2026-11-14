# Plan de pruebas: Billo

## 1. Propósito

Este documento define qué se prueba y cuál es el resultado esperado de cada requisito (RF1 a RF10 y RNF1 a RNF4), antes de que existan las funciones. QA prueba contra estos criterios y clasifica los bugs según `criterios-calidad.md`.

## 2. Actores

| Actor | Rol dentro del sistema |
|---|---|
| Usuario registrado | Registra gastos y membresías, define presupuestos, consulta reportes y recibe notificaciones. |
| Administrador | Gestiona el catálogo predefinido de servicios y categorías, y da soporte técnico. |
| Visitante | Explora una versión demo sin registrarse. |

## 3. Convenciones

| Campo | Valores |
|---|---|
| Tipo | Positivo (flujo correcto), Negativo (datos o acciones inválidas), Usabilidad. |
| Prioridad | Alta (función principal o seguridad), Media (función de apoyo), Baja (detalle menor). |
| ID del caso | `CP-RFx-nn` para requisitos funcionales y `CP-RNFx-nn` para no funcionales. |

### Regresión de plataforma: Expo SDK 58

La migración de SDK 57 a SDK 58 conserva los criterios funcionales de este plan.
Antes de aprobarla, ejecutar los checks automáticos y los casos de dispositivo
`SDK58-01` a `SDK58-06` de la [guía de migración](qa/sdk58-migracion.md).
Registrar SDK, commit, versión de Node, dispositivo y tipo de build en cada ejecución.
Las pruebas unitarias y HTTP no aprueban por sí solas la navegación ni los módulos nativos.

## 4. Supuestos por confirmar con Joshua

| # | Supuesto usado en los casos | Por qué hay que confirmarlo |
|---|---|---|
| 1 | "Se acerque al presupuesto" (RF4) significa llegar al 80 % del presupuesto. | La propuesta no define el porcentaje. |
| 2 | Las "pantallas principales" (RNF2) son inicio, lista de gastos, presupuestos, membresías y gráficas. | La propuesta no las enumera. |
| 3 | Para esta entrega se prueba el aviso a 2 y 3 días del cobro; a 10 días no se envía y una segunda ejecución del mismo día no lo repite. | La propuesta indica entre uno y tres días; HU-46 implementa una ventana de 0 a 3 días y deduplicación diaria. Joshua debe confirmar el alcance, incluido el día del cobro y los avisos en días distintos. |

## 5. Casos de prueba: requisitos funcionales

| ID | Requisito | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-RF1-01 | RF1. Registro e inicio de sesión | La app está instalada y el correo `prueba1@correo.com` no existe. | 1) Abrir la pantalla de registro 2) Capturar nombre, correo `prueba1@correo.com` y contraseña `Billo#2026` 3) Pulsar Registrarme | La cuenta se crea y el usuario entra a la pantalla de inicio. | Positivo | Alta |
| CP-RF1-02 | RF1. Registro e inicio de sesión | Existe la cuenta `prueba1@correo.com`. | 1) Abrir la pantalla de inicio de sesión 2) Capturar `prueba1@correo.com` y `Billo#2026` 3) Pulsar Iniciar sesión | El usuario accede a su cuenta y ve sus datos. | Positivo | Alta |
| CP-RF1-03 | RF1. Registro e inicio de sesión | Existe la cuenta `prueba1@correo.com`. | 1) Abrir la pantalla de registro 2) Capturar el correo `prueba1@correo.com` con cualquier contraseña 3) Pulsar Registrarme | Se muestra un error de correo ya registrado y no se crea una segunda cuenta. | Negativo | Alta |
| CP-RF1-04 | RF1. Registro e inicio de sesión | Existe la cuenta `prueba1@correo.com`. | 1) Abrir la pantalla de inicio de sesión 2) Capturar `prueba1@correo.com` y la contraseña incorrecta `xxxx` 3) Pulsar Iniciar sesión | Se rechaza el acceso con un mensaje de credenciales inválidas, sin indicar cuál dato falló. | Negativo | Alta |
| CP-RF2-01 | RF2. Registrar gasto diario | Sesión iniciada y categoría "Comida" disponible. | 1) Abrir Nuevo gasto 2) Capturar monto `80.50`, categoría Comida, fecha de hoy y método Efectivo 3) Guardar | El gasto aparece en la lista con los cuatro datos capturados. | Positivo | Alta |
| CP-RF2-02 | RF2. Registrar gasto diario | Sesión iniciada. | 1) Abrir Nuevo gasto 2) Capturar monto `ochenta` y los demás datos válidos 3) Guardar (en API: `POST /gastos`) | Error 400, mensaje de monto inválido y el gasto no se guarda. | Negativo | Alta |
| CP-RF2-03 | RF2. Registrar gasto diario | Sesión iniciada. | 1) Abrir Nuevo gasto 2) Dejar la categoría vacía y capturar los demás datos 3) Guardar | Se indica que la categoría es obligatoria y el gasto no se guarda. | Negativo | Media |
| CP-RF3-01 | RF3. Presupuesto mensual por categoría | Sesión iniciada y categoría "Comida" disponible. | 1) Abrir Presupuestos 2) Elegir Comida y capturar `2000` para el mes actual 3) Guardar | El presupuesto de Comida queda en $2,000 para el mes actual. | Positivo | Alta |
| CP-RF3-02 | RF3. Presupuesto mensual por categoría | Sesión iniciada. | 1) Abrir Presupuestos 2) Elegir una categoría y capturar `-500` 3) Guardar | Se rechaza el monto negativo y no se guarda el presupuesto. | Negativo | Media |
| CP-RF4-01 | RF4. Alerta de presupuesto | Presupuesto de Comida de $1,000 y gastos de Comida por $700. | 1) Registrar un gasto de Comida por $100 (total $800, 80 %) | La app muestra una alerta de que el gasto se acerca al presupuesto de Comida. | Positivo | Alta |
| CP-RF4-02 | RF4. Alerta de presupuesto | Presupuesto de Comida de $1,000 y gastos de Comida por $950. | 1) Registrar un gasto de Comida por $100 (total $1,050) | La app muestra una alerta de que el presupuesto de Comida fue superado. | Positivo | Alta |
| CP-RF4-03 | RF4. Alerta de presupuesto | Presupuesto de Comida de $1,000 y gastos de Comida por $100. | 1) Registrar un gasto de Comida por $50 (total $150, 15 %) | No se muestra ninguna alerta. | Negativo | Media |
| CP-RF4-04 | RF4. Límite 79,99 % | Presupuesto de $1,000 y gastos de $700. | 1) Crear un gasto de $99.90 2) Repetir mediante edición en datos independientes 3) Consultar presupuestos | Total $799.90; estado `ok`; sin campo `alerta`. | Negativo | Alta |
| CP-RF4-05 | RF4. Límite 80 % | Presupuesto de $1,000 y gastos de $700. | 1) Crear un gasto de $100 2) Repetir mediante edición en datos independientes 3) Consultar presupuestos | Total $800; estado `alerta`; aviso de acercamiento. | Positivo | Alta |
| CP-RF4-06 | RF4. Límite 100 % | Presupuesto de $1,000 y gastos de $950. | 1) Crear un gasto de $50 2) Repetir mediante edición en datos independientes 3) Consultar presupuestos | Total $1,000; estado `alerta`; todavía no está `excedido`. | Positivo | Alta |
| CP-RF4-07 | RF4. Límite 100,01 % | Presupuesto de $1,000 y gastos de $950. | 1) Crear un gasto de $50.10 2) Repetir mediante edición en datos independientes 3) Consultar presupuestos | Total $1,000.10; estado `excedido`; aviso de presupuesto superado. | Positivo | Alta |
| CP-RF5-01 | RF5. Gestión de membresías | Sesión iniciada. | 1) Abrir Membresías y pulsar Agregar 2) Capturar nombre "Netflix", costo `199`, frecuencia Mensual y fecha de cobro dentro de 10 días 3) Guardar | La membresía aparece en la lista con los cuatro datos capturados. | Positivo | Alta |
| CP-RF5-02 | RF5. Gestión de membresías | Existe la membresía "Netflix" de $199. | 1) Abrir la membresía 2) Cambiar el costo a `219` 3) Guardar 4) Volver a la lista | El costo se actualiza a $219. Al eliminarla con Eliminar y confirmar, desaparece de la lista. | Positivo | Media |
| CP-RF5-03 | RF5. Gestión de membresías | Sesión iniciada. | 1) Pulsar Agregar membresía 2) Dejar el nombre vacío y capturar costo `199` 3) Guardar | Se indica que el nombre es obligatorio y la membresía no se guarda. | Negativo | Media |
| CP-RF5-04 | RF5. Gestión de membresías | Sesión iniciada. | 1) Pulsar Agregar membresía 2) Capturar nombre "Spotify" y costo `abc` 3) Guardar | Se rechaza el costo inválido y la membresía no se guarda. | Negativo | Media |
| CP-RF6-01 | RF6. Gasto total mensual | En el mes actual hay gastos diarios por $500 y membresías por $300. | 1) Abrir la pantalla de Resumen mensual | Se muestra gasto variable $500, gasto fijo por membresías $300 y total $800, cada uno por separado. | Positivo | Alta |
| CP-RF6-02 | RF6. Gasto total mensual | Usuario nuevo sin gastos ni membresías. | 1) Abrir la pantalla de Resumen mensual | Se muestran $0 en variable, fijo y total, sin errores. | Negativo | Media |
| CP-RF7-01 | RF7. Notificación de cobro | Membresía "Netflix" con cobro dentro de 3 días y notificaciones permitidas en el dispositivo. | 1) Esperar o simular la ejecución del aviso a 3 días del cobro | El dispositivo recibe una notificación push con el nombre de la membresía y la fecha de cobro. | Positivo | Alta |
| CP-RF7-02 | RF7. Notificación de cobro | Membresía con cobro dentro de 10 días. | 1) Simular la ejecución del aviso hoy | No se envía ninguna notificación todavía. | Negativo | Media |
| CP-RF7-03 | RF7. Notificación de cobro | Membresía "Netflix" que se eliminó ayer, con cobro dentro de 3 días. | 1) Simular la ejecución del aviso | No se envía notificación de una membresía eliminada. | Negativo | Media |
| CP-RF7-04 | RF7. Aviso a 2 días | Android físico con APK HU-53, permiso y token push registrados; membresía activa Netflix de $199, cobro D+2, sin aviso en D. | 1) Registrar fecha D y estado inicial 2) Dejar la app en segundo plano 3) Ejecutar el proceso de avisos con referencia D 4) Abrir la bandeja y tocar el aviso | Llega un aviso con Netflix, 2 días y $199; se abre Cartera → Suscripciones y se guarda `ultima_notificacion = D`. Un ticket de Expo por sí solo no acredita recepción. | Positivo | Alta |
| CP-RF7-05 | RF7. Aviso repetido | CP-RF7-04 pasó; misma membresía, token y fecha D, sin restablecer `ultima_notificacion`. | 1) Conservar la evidencia del primer envío 2) Ejecutar de nuevo el proceso con D 3) Revisar bandeja, contadores y BD | No hay segundo envío ni segundo aviso; `enviadas = 0`, `yaNotificadas = 1` en datos aislados; la marca sigue siendo D. | Negativo | Alta |
| CP-RF7-06 | RF7. Usuario sin token push | Cuenta QA A con `expo_push_token = NULL` y membresía activa a D+2; cuenta de control B con token válido y otro cobro a D+2; sin avisos previos en D. | 1) Ejecutar el proceso con D 2) Consultar contadores y marcas 3) Usar la app de A 4) Comprobar recepción en B | A no recibe aviso ni queda marcada como notificada; `sinToken = 1`; el proceso continúa y B recibe su aviso. La app de A funciona sin cierre ni error bloqueante. Se trata del token push, no del JWT. | Negativo | Alta |
| CP-RF8-01 | RF8. Gráficas por categoría | Gastos del mes en Comida $600, Transporte $300 y Ocio $100. | 1) Abrir Reportes y elegir Gráfica por categoría | La gráfica muestra tres categorías con proporciones 60 %, 30 % y 10 %. | Positivo | Media |
| CP-RF8-02 | RF8. Gráficas por categoría | Usuario nuevo sin gastos. | 1) Abrir Reportes y elegir Gráfica por categoría | Se muestra un mensaje de que no hay datos, sin errores ni gráfica vacía rota. | Negativo | Baja |
| CP-RF9-01 | RF9. Catálogo del Administrador | Sesión iniciada como Administrador. | 1) Abrir Catálogo 2) Agregar la categoría "Mascotas" 3) Guardar | La categoría aparece en el catálogo y está disponible para los usuarios. | Positivo | Media |
| CP-RF9-02 | RF9. Catálogo del Administrador | Sesión iniciada como Usuario registrado (no Administrador). | 1) Intentar abrir Catálogo o llamar al endpoint de administración | Acceso denegado (error 403) y no se modifica el catálogo. | Negativo | Alta |
| CP-RF9-03 | RF9. Servicios como administrador | APK HU-53, cuentas QA admin y normal; nombre de servicio `QA Entrega` libre. | 1) Como admin abrir Perfil → Administrar catálogo 2) Crear `QA Entrega` con costo 99 3) Editar costo a 109 4) Como usuario normal consultar el catálogo al agregar una suscripción 5) Como admin eliminar el servicio sin membresías y volver a consultar como usuario | Alta, edición y baja persisten y son visibles al otro usuario al recargar; API 201, 200 y 200. El usuario normal puede consultar, pero POST/PUT/DELETE responden 403 `PROHIBIDO` y dejan el catálogo intacto (CP-RF9-02). | Positivo | Alta |
| CP-RF9-04 | RF9. Servicio en uso | Admin QA y usuario normal con una membresía que referencia el servicio QA mediante `servicio_id`; registrar costo, fecha y totales iniciales. | 1) Como admin intentar eliminar el servicio y confirmar 2) Revisar respuesta y mensaje 3) Recargar catálogo y membresía del usuario | HTTP 409 `SERVICIO_EN_USO`, mensaje comprensible y sin eliminación. Servicio, membresía y totales se conservan. | Negativo | Alta |
| CP-RF10-01 | RF10. Modo de exploración | La app está instalada y no hay sesión iniciada. | 1) Pulsar Explorar sin cuenta 2) Navegar por gastos, membresías y gráficas | Se muestran datos de ejemplo en todas las pantallas sin pedir registro. | Positivo | Media |
| CP-RF10-02 | RF10. Modo de exploración | Visitante en modo exploración; registrar los datos de ejemplo iniciales. | 1) Intentar registrar un gasto nuevo 2) Repetir al crear, editar y eliminar gastos, presupuestos y membresías 3) Elegir Seguir explorando 4) Volver a consultar los datos | Cada acción ofrece crear cuenta; no guarda ni cambia datos reales o de ejemplo ni envía escrituras a la API; Seguir explorando conserva la navegación. Registrar evidencia de cada variante. | Negativo | Media |
| CP-RF10-03 | RF10. Modo de exploración | La app está instalada y no hay sesión iniciada. | 1) Abrir la app por primera vez 2) Encontrar el botón Explorar sin cuenta | Un visitante lo encuentra en la primera pantalla, sin instrucciones y en máximo 2 toques. | Usabilidad | Baja |
| CP-RF10-04 | RF10. Visitante sin red | APK HU-53 instalado, sin sesión, Wi-Fi y datos móviles apagados; iniciar la app desde cerrada. | 1) Pulsar Explorar sin cuenta 2) Recorrer Inicio, Movimientos, Cartera y Reportes 3) Cambiar mes y categoría 4) Revisar tráfico y capturar estado de conectividad | Se ven datos locales de ejemplo y cálculos coherentes sin conexión, sin solicitudes de red de Billo ni mensajes de error o cierres. No se requiere Metro ni haber precargado la demo. | Positivo | Alta |
| CP-RF10-05 | RF10. Crear cuenta desde visitante | Visitante en APK HU-53, red restablecida y correo QA nuevo. | 1) Intentar guardar 2) Elegir Crear cuenta 3) Completar registro 4) Consultar Inicio, gastos, membresías y presupuestos 5) Guardar un gasto real de $80.50 6) Cerrar sesión y entrar de nuevo | Abre Registro, sale de visitante y habilita API; cuenta nueva sin datos demo, gasto real persistido y visible tras reingresar. Cancelar la invitación se cubre en CP-RF10-02. | Positivo | Alta |

## 6. Casos de prueba: requisitos no funcionales

| ID | Requisito | Precondición | Pasos | Resultado esperado | Tipo | Prioridad |
|---|---|---|---|---|---|---|
| CP-RNF1-01 | RNF1. Funciona en Android | Compilación de prueba y un emulador Android. | 1) Instalar la app en el emulador 2) Recorrer registro, nuevo gasto, membresías y gráficas | Todas las funciones operan sin cierres inesperados. | Positivo | Alta |
| CP-RNF1-02 | RNF1. Funciona en Android | Compilación de prueba y un dispositivo Android físico. | 1) Instalar la app 2) Recorrer los mismos flujos que en CP-RNF1-01 | Mismo resultado que en el emulador, sin cierres inesperados. | Positivo | Alta |
| CP-RNF2-01 | RNF2. Respuesta menor a 2 s | Sesión iniciada con al menos 50 gastos registrados. | 1) Abrir cada pantalla principal (inicio, gastos, presupuestos, membresías, gráficas) 2) Medir 5 veces cada una en Postman o en la app 3) Calcular el promedio | El promedio de cada pantalla es menor a 2 s y ninguna medición pasa de 2 s. | Positivo | Alta |
| CP-RNF2-02 | RNF2. Respuesta menor a 2 s | Sesión iniciada. | 1) Guardar un gasto nuevo 2) Medir el tiempo hasta recibir la confirmación | La confirmación llega en menos de 2 s. | Positivo | Media |
| CP-RNF3-01 | RNF3. Contraseñas cifradas | Existe la cuenta `prueba1@correo.com` creada con `Billo#2026`. | 1) Consultar el registro del usuario directamente en la base de datos | El campo de contraseña contiene un hash y no `Billo#2026` ni ninguna contraseña legible. | Positivo | Alta |
| CP-RNF3-02 | RNF3. Contraseñas cifradas | Existen varios usuarios registrados. | 1) Consultar todas las filas de usuarios 2) Buscar contraseñas en texto plano en la base de datos y en los logs | Ninguna contraseña aparece en texto plano. | Negativo | Alta |
| CP-RNF4-01 | RNF4. Disponibilidad del 99 % | El sistema está desplegado y con monitoreo activo durante el periodo de evaluación. | 1) Revisar el reporte de disponibilidad del periodo | La disponibilidad es mayor o igual a 99 % (máximo 7.2 horas de caída por cada 30 días). | Positivo | Media |

## 7. Resumen de cobertura

| Requisito | Casos | Positivo | Negativo | Usabilidad |
|---|---|---|---|---|
| RF1 | 4 | 2 | 2 | 0 |
| RF2 | 3 | 1 | 2 | 0 |
| RF3 | 2 | 1 | 1 | 0 |
| RF4 | 7 | 5 | 2 | 0 |
| RF5 | 4 | 2 | 2 | 0 |
| RF6 | 2 | 1 | 1 | 0 |
| RF7 | 6 | 2 | 4 | 0 |
| RF8 | 2 | 1 | 1 | 0 |
| RF9 | 4 | 2 | 2 | 0 |
| RF10 | 5 | 3 | 1 | 1 |
| RNF1 | 2 | 2 | 0 | 0 |
| RNF2 | 2 | 2 | 0 | 0 |
| RNF3 | 2 | 1 | 1 | 0 |
| RNF4 | 1 | 1 | 0 | 0 |
| **Total** | **46** | **26** | **19** | **1** |

La ejecución API de RF3/RF4 y sus casos adicionales de aislamiento se documentan
en [QA presupuestos](qa/presupuestos-reporte.md). Los sufijos `POST`, `PUT`,
`GET`, `L7999`, `L8000`, `L10000` y `L10001` distinguen variantes del mismo caso.
Se verifica el estado con montos exactos; la API actual presenta `porcentaje`
como entero redondeado. Los casos HTTP no sustituyen la verificación visual en dispositivo.

## 8. Entrega RF7, RF9 y RF10 sobre HU-53

El [reporte de entrega](qa/entrega-rf7-rf9-rf10-reporte.md) registra los 15 casos
de RF7/RF9/RF10 y los 24 de regresión de RF1–RF6 y RF8, con resultado, evidencia
y decisión. La [lista de requisitos](lista-requisitos.md) conserva la aprobación
histórica y separa el dictamen de esta entrega.

Usar el APK identificado en HU-53, no Expo Go ni una exportación web. Registrar
URL de descarga, SHA-256, versión instalada, commit de origen (si se conoce),
API, SDK del APK, modelo, Android, ejecutor y fecha local. El commit de este
checkout no demuestra qué código contiene el APK.

Para RF7 preparar datos aislados en un backend QA compatible con el APK y
ejecutar el job de forma controlada, sin esperar días ni cambiar el reloj del
teléfono. Registrar D, zona horaria y fechas absolutas D+2/D+3/D+10. La referencia
del job no cambia el entorno de la app. Usar un solo planificador durante la
prueba para evitar envíos ajenos a la corrida; guardar estado anterior/posterior
de `ultima_notificacion`, resumen del job y recepción en el teléfono. Para el
caso a 10 días comprobar también cero envíos en el job: no basta con que el
teléfono no muestre nada. Para el aviso eliminado verificar ausencia en BD y
cero envíos. Si no se puede aislar o ejecutar el job, registrar Bloqueado.

Conservar CP-RF9-01 (alta de categoría Mascotas) como caso independiente del CRUD
de servicios: no se aprueba mediante CP-RF9-03. Registrar cualquier diferencia
de alcance con Joshua y cualquier defecto reproducido con la plantilla.

Solo marcar Pasa/Falla tras ejecutar y adjuntar evidencia; Bloqueado no cuenta
como ninguno. Cada falla lleva una ficha en `docs/qa/bugs/` y aviso al responsable
el mismo día (America/Mexico_City), registrando enlace, destinatario y hora.
Reutilizar bugs existentes. No aprobar un RF con casos sin ejecutar o sin
evidencia, ni con bugs críticos/altos abiertos; aplicar los criterios de calidad.
