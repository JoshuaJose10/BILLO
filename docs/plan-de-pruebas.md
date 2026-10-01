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

## 4. Supuestos por confirmar con Joshua

| # | Supuesto usado en los casos | Por qué hay que confirmarlo |
|---|---|---|
| 1 | "Se acerque al presupuesto" (RF4) significa llegar al 80 % del presupuesto. | La propuesta no define el porcentaje. |
| 2 | Las "pantallas principales" (RNF2) son inicio, lista de gastos, presupuestos, membresías y gráficas. | La propuesta no las enumera. |
| 3 | La notificación de RF7 se envía 3 días antes del cobro (límite superior del rango). | La propuesta indica entre uno y tres días. |

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
| CP-RF5-01 | RF5. Gestión de membresías | Sesión iniciada. | 1) Abrir Membresías y pulsar Agregar 2) Capturar nombre "Netflix", costo `199`, frecuencia Mensual y fecha de cobro dentro de 10 días 3) Guardar | La membresía aparece en la lista con los cuatro datos capturados. | Positivo | Alta |
| CP-RF5-02 | RF5. Gestión de membresías | Existe la membresía "Netflix" de $199. | 1) Abrir la membresía 2) Cambiar el costo a `219` 3) Guardar 4) Volver a la lista | El costo se actualiza a $219. Al eliminarla con Eliminar y confirmar, desaparece de la lista. | Positivo | Media |
| CP-RF5-03 | RF5. Gestión de membresías | Sesión iniciada. | 1) Pulsar Agregar membresía 2) Dejar el nombre vacío y capturar costo `199` 3) Guardar | Se indica que el nombre es obligatorio y la membresía no se guarda. | Negativo | Media |
| CP-RF5-04 | RF5. Gestión de membresías | Sesión iniciada. | 1) Pulsar Agregar membresía 2) Capturar nombre "Spotify" y costo `abc` 3) Guardar | Se rechaza el costo inválido y la membresía no se guarda. | Negativo | Media |
| CP-RF6-01 | RF6. Gasto total mensual | En el mes actual hay gastos diarios por $500 y membresías por $300. | 1) Abrir la pantalla de Resumen mensual | Se muestra gasto variable $500, gasto fijo por membresías $300 y total $800, cada uno por separado. | Positivo | Alta |
| CP-RF6-02 | RF6. Gasto total mensual | Usuario nuevo sin gastos ni membresías. | 1) Abrir la pantalla de Resumen mensual | Se muestran $0 en variable, fijo y total, sin errores. | Negativo | Media |
| CP-RF7-01 | RF7. Notificación de cobro | Membresía "Netflix" con cobro dentro de 3 días y notificaciones permitidas en el dispositivo. | 1) Esperar o simular la ejecución del aviso a 3 días del cobro | El dispositivo recibe una notificación push con el nombre de la membresía y la fecha de cobro. | Positivo | Alta |
| CP-RF7-02 | RF7. Notificación de cobro | Membresía con cobro dentro de 10 días. | 1) Simular la ejecución del aviso hoy | No se envía ninguna notificación todavía. | Negativo | Media |
| CP-RF7-03 | RF7. Notificación de cobro | Membresía "Netflix" que se eliminó ayer, con cobro dentro de 3 días. | 1) Simular la ejecución del aviso | No se envía notificación de una membresía eliminada. | Negativo | Media |
| CP-RF8-01 | RF8. Gráficas por categoría | Gastos del mes en Comida $600, Transporte $300 y Ocio $100. | 1) Abrir Reportes y elegir Gráfica por categoría | La gráfica muestra tres categorías con proporciones 60 %, 30 % y 10 %. | Positivo | Media |
| CP-RF8-02 | RF8. Gráficas por categoría | Usuario nuevo sin gastos. | 1) Abrir Reportes y elegir Gráfica por categoría | Se muestra un mensaje de que no hay datos, sin errores ni gráfica vacía rota. | Negativo | Baja |
| CP-RF9-01 | RF9. Catálogo del Administrador | Sesión iniciada como Administrador. | 1) Abrir Catálogo 2) Agregar la categoría "Mascotas" 3) Guardar | La categoría aparece en el catálogo y está disponible para los usuarios. | Positivo | Media |
| CP-RF9-02 | RF9. Catálogo del Administrador | Sesión iniciada como Usuario registrado (no Administrador). | 1) Intentar abrir Catálogo o llamar al endpoint de administración | Acceso denegado (error 403) y no se modifica el catálogo. | Negativo | Alta |
| CP-RF10-01 | RF10. Modo de exploración | La app está instalada y no hay sesión iniciada. | 1) Pulsar Explorar sin cuenta 2) Navegar por gastos, membresías y gráficas | Se muestran datos de ejemplo en todas las pantallas sin pedir registro. | Positivo | Media |
| CP-RF10-02 | RF10. Modo de exploración | Visitante en modo exploración. | 1) Intentar registrar un gasto nuevo | La app invita a crear una cuenta y no guarda datos reales del visitante. | Negativo | Media |
| CP-RF10-03 | RF10. Modo de exploración | La app está instalada y no hay sesión iniciada. | 1) Abrir la app por primera vez 2) Encontrar el botón Explorar sin cuenta | Un visitante lo encuentra en la primera pantalla, sin instrucciones y en máximo 2 toques. | Usabilidad | Baja |

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
| RF4 | 3 | 2 | 1 | 0 |
| RF5 | 4 | 2 | 2 | 0 |
| RF6 | 2 | 1 | 1 | 0 |
| RF7 | 3 | 1 | 2 | 0 |
| RF8 | 2 | 1 | 1 | 0 |
| RF9 | 2 | 1 | 1 | 0 |
| RF10 | 3 | 1 | 1 | 1 |
| RNF1 | 2 | 2 | 0 | 0 |
| RNF2 | 2 | 2 | 0 | 0 |
| RNF3 | 2 | 1 | 1 | 0 |
| RNF4 | 1 | 1 | 0 | 0 |
| **Total** | **35** | **19** | **15** | **1** |
