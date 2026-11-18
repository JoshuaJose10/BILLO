# HU-79: QA de mejoras de suscripciones (HU-71 a HU-78)

Fecha de preparación: **2026-11-18**, America/Mexico_City.
Estado: **ejecución en progreso sobre APK 1.0.1/versionCode 2: 7 Pasa,
1 Falla y 8 pendientes; corrección reportada para la falla en un APK posterior,
reprueba diferida por indicación del usuario**.
Responsable de QA de la historia: Luis Dorian. Revisión final: PO.
Tarea: [HU-79 en ClickUp](https://sharing.clickup.com/90141625121/t/h/1k5g91bpy51/IUVQQ2S7S0MTN8U).
Referencia: [contrato v1.11](../api-contrato.md) y
[decisiones de esquema](../decisiones-esquema-sprint3.md).

## Ambiente y observación inicial

- Samsung SM-A530F, Android 9, conectado y autorizado por USB.
- APK instalado: `com.billo.app`, versión 1.0.1, versionCode 2.
- Build/commit, hash del APK y API incluida en el binario: por identificar.
- Cuenta **Dorian**, confirmada por el usuario como cuenta de pruebas.
- Mes observado: **noviembre de 2026**. Cartera muestra cero suscripciones.
- Reportes muestra variable **200.00**, fijo **0.00** y total **200.00**.
- En Nueva suscripción se observan buscador del catálogo, selector MXN,
  frecuencia y opciones de pago. No se guardó ninguna suscripción.

Capturas de esta inspección:

- [Cartera](hu79-evidencias/ALCANCE-APK/01-cartera-20261118T081626145Z-083ba4.png).
- [Suscripciones vacías](hu79-evidencias/ALCANCE-APK/02-suscripciones-20261118T081640009Z-3fd215.png).
- [Formulario de alta](hu79-evidencias/ALCANCE-APK/03-formulario-20261118T081708211Z-00dd42.png).
- [Reportes antes de cambios](hu79-evidencias/ALCANCE-APK/04-reportes-base-20261118T081840499Z-006723.png).

Esta inspección identifica pantallas y una base de comparación; no acredita el
funcionamiento de las mejoras ni asigna Pasa a los casos siguientes. La presencia
de una función en el código local tampoco confirma su inclusión en este APK.

## Datos usados en la ejecución

El usuario registró A/B/C y confirmó que eliminó los movimientos anteriores
para preparar esta ejecución. La nueva base tiene variable **0.00**: con las
tres suscripciones activas, Reportes debe mostrar fijo y total **400.00**.
Los 200.00 de la inspección inicial se conservan arriba como antecedente;
su eliminación fue confirmada por el usuario y no se registra como defecto.
Los nombres reales difieren del plan original; se identifican por importe y fecha.

| Identificador | Nombre | Frecuencia | Costo MXN | Fecha de cobro |
|---|---|---|---:|---|
| A | Prueba Mes 1 | Mensual | 100.00 | 2026-11-20 |
| B | Prueba 2 Anuam | Anual | 1200.00 | 2026-11-22 |
| C | Prueba 2 Anual 2 | Anual | 2400.00 | 2026-12-20 |

Registrar los IDs obtenidos y capturar cada alta. Las cifras esperadas siguientes
suponen solo A/B/C activas, sin otras suscripciones ni cambios en los gastos:

- Mensualizado: `100 + 1200/12 + 2400/12 = 400.00`.
- Proyección anual: `100*12 + 1200 + 2400 = 4800.00`.
- Cobros de noviembre: `100 + 1200 = 1300.00`.
- Reportes de noviembre: variable `0.00`, fijo `400.00`, total `400.00`.

Primera tanda ejecutada por ADB y revisión visual de capturas: **02:24–02:33**
del 2026-11-18, America/Mexico_City. Los nombres de archivos usan UTC.
Bitácora y capturas seleccionadas: [índice de ejecución](hu79-evidencias/indice-ejecucion.md).
Se pausaron y reactivaron A/B para las variantes; al terminar ambas están activas
y se comprobaron otra vez los valores 400/4800/1300 y Reportes 0/400/400.

**Aclaración del usuario del 2026-11-18:** HU79-BUG-01 ya está corregido en una
versión más nueva del APK. La tanda documentada corresponde al binario instalado
1.0.1/versionCode 2 y conserva su resultado observado. Falta identificar e instalar
el APK corregido y repetir CP-HU75-01 antes de cerrar esa reprueba o extender
el dictamen a la versión nueva. Los resultados previos no acreditan automáticamente
el comportamiento del APK posterior.

El usuario indicó después que **no quiere repetir este caso en este momento**.
La reprueba queda diferida por su decisión; se puede continuar el resto de casos.
No se instaló otro APK ni se repitió CP-HU75-01 tras esta indicación.

Son cálculos distintos. No comparar el cobro de noviembre de 1300 con el fijo
mensualizado de Reportes de 400 como si fueran la misma métrica. Si la ejecución
ocurre otro día o mes, ajustar fechas y documentar los nuevos esperados antes
de probar. Para búsqueda/duplicados, usar además un servicio del catálogo que
esté disponible en el APK, registrar sus datos y retirarlo antes de conciliar A/B/C.

## Casos base

Cada fila debe completarse con el resultado real, las capturas, fecha/hora y
bug si falla. Las acciones comparten datos, pero el dictamen es individual.

| Caso | Pasos | Esperado | Real | Estado | Evidencia / bug |
|---|---|---|---|---|---|
| CP-HU71-01 | Usuario crea A/B/C; abrir Suscripciones; consultar proyección anual; cerrar proceso y reabrir. | 4800.00 MXN antes y después de volver. | 4800.00 en ambas capturas; siguen tres activas tras reabrir. | Pasa | [SS y acciones](hu79-evidencias/indice-ejecucion.md#cp-hu71-01-y-cp-hu71-02) |
| CP-HU71-02 | Con A/B/C activas, consultar Este mes se cobra de noviembre. | 1300.00 MXN; B cuenta completa y C no se cobra en noviembre. | Muestra 1300.00; lista confirma 100 mensual al 20/11, 1200 anual al 22/11 y 2400 anual al 20/12. | Pasa | [SS y acciones](hu79-evidencias/indice-ejecucion.md#cp-hu71-01-y-cp-hu71-02) |
| CP-HU72-01 | Abrir alta; buscar spo; sustituir por SPO; buscar zzzzqa79; limpiar; cerrar sin guardar. | Ambas variantes de spo filtran Spotify; texto inexistente sin resultados; limpiar restaura catálogo. | spo y SPO muestran planes Spotify; zzzzqa79 muestra Sin coincidencias; limpiar vuelve a Amazon Prime/Apple Music. No se guarda alta. | Pasa | [SS y acciones](hu79-evidencias/indice-ejecucion.md#cp-hu72-01) |
| CP-HU72-02 | Con A/B/C, elegir Costo, Frecuencia y volver a Fecha. | Costo mensual descendente C/A/B; Frecuencia agrupa una mensual y dos anuales; Fecha A/B/C; totales conservados. | Costo C/A/B pese a que B tiene importe anual mayor que A; Frecuencia 1 mensual y 2 anuales; Fecha A/B/C. Anual 4800 y mes 1300 se conservan. | Pasa | [SS y acciones](hu79-evidencias/indice-ejecucion.md#cp-hu72-02) |
| CP-HU73-01 | Con fechas de A/B a 2 y 4 días del 18/11, abrir Inicio; revisar Próximo cobro y También esta semana. | A/B representadas en los cobros próximos sin duplicarse entre tarjetas; C queda fuera de los próximos siete días. | Próximo cobro A por 100 en dos días; También esta semana B por 1200, domingo; C ausente de la tarjeta semanal. | Pasa | [SS](hu79-evidencias/CP-HU73-01/01-inicio-20261118T082538154Z-2829e7.png) |
| CP-HU73-02 | Variante equivalente sin próximos cobros: pausar A/B; abrir Inicio; reactivar ambas; volver a Inicio. No cambiar fechas. | Tarjeta semanal oculta sin cobros activos en siete días; vuelve al restaurar A/B. | Con A/B pausadas solo aparece próximo cobro C a 32 días, sin tarjeta semanal. Reactivadas: A próxima y B en También esta semana. | Pasa | [SS y acciones](hu79-evidencias/indice-ejecucion.md#cp-hu73-02) |
| CP-HU74-01 | Guardar un servicio del catálogo; intentar añadirlo otra vez; cancelar el aviso; revisar lista. | Aviso de servicio repetido; cancelar no crea el segundo registro. | Sin ejecutar. | Pendiente | — |
| CP-HU74-02 | Repetir el intento anterior y confirmar que es otro plan; guardar; revisar lista; retirar solo los registros auxiliares creados. | Permite el segundo plan y guarda una sola alta por confirmación. | Sin ejecutar. | Pendiente | — |
| CP-HU74-03 | Editar A sin cambiar su identidad; después abrir alta de un servicio diferente. Cerrar sin guardar. | No avisa duplicado al editar el mismo registro ni con un servicio distinto. | Sin ejecutar. | Pendiente | — |
| CP-REG-SUS-01 | Con solo A/B/C activas, abrir Cartera y Reportes de noviembre; reabrir app y comparar. | Mensualizado 400.00; Reportes variable 0.00, fijo 400.00, total 400.00; persistencia sin duplicación. | Cartera 400; Reportes cargado 0/400/400 antes y después de reabrir. La captura inmediata de navegación mostró ceros transitorios y no se usó como resultado final. | Pasa | [SS y acciones](hu79-evidencias/indice-ejecucion.md#cp-reg-sus-01) |
| CP-REG-SUS-02 | Agregar gastos auxiliares identificados en dos categorías; conciliar categorías y variable; recorrer selector de mes; retirar esos gastos. | Las categorías suman solo los gastos auxiliares; fijo 400.00 separado; otro mes conserva sus propios gastos; retirar auxiliares restaura variable 0.00. | Base sin gastos comprobada; falta variante con categorías y cambio de mes. | Pendiente | — |
| CP-REG-SUS-03 | Al finalizar, retirar solo auxiliares creados por QA; conservar A/B/C registradas por el usuario, activas y con fechas originales; reabrir Cartera y Reportes. | Tres suscripciones, fijo 400.00, variable 0.00 y total 400.00; sin auxiliares ni cambios residuales. | A/B restauradas tras la variante de pausa; verificación final pendiente del resto de casos. | Pendiente | — |

## Casos condicionados a inclusión

El usuario informó el 2026-11-18 que **HU-71 a HU-78 están todas completadas en
el tablero**. Se registra su declaración; no se consultó el tablero directamente.
Pausa e historial se observaron en el detalle del APK. Falta identificar el build
y confirmar la ruta/criterios de costo compartido y la relación HU-76/HU-78.

| Caso | Pasos | Esperado | Real | Estado | Evidencia / bug |
|---|---|---|---|---|---|
| CP-HU75-01 | Pausar A; revisar Cartera, Inicio y Reportes; cerrar proceso y reabrir; reactivar A. | Mensualizado 300.00, anual 3600.00, mes 1200.00, Reportes 0/300/300; próximo cobro activo B el 22/11; reactivar restaura A/B/C. | En APK 1.0.1/versionCode 2: totales y pausa persistente correctos; Inicio muestra B a cuatro días. Cartera conserva Próximo cobro el 20 nov de A pausada, incluso tras reiniciar proceso. Reactivación restaura 400/4800/1300 y Reportes 0/400/400. Usuario informa corrección en APK posterior; reprueba diferida. | Falla en APK probado; reprueba diferida | [HU79-BUG-01](bugs/HU79-BUG-01-proximo-cobro-pausada.md), [SS](hu79-evidencias/indice-ejecucion.md#cp-hu75-01) |
| CP-COMPARTIDO-01 | Confirmar regla de reparto; en una suscripción auxiliar capturar costo 300 entre tres personas; guardar, reabrir y editar participantes. | Si la regla acordada es reparto igual, parte propia 100.00; totales usan la parte definida por la historia. Adjuntar regla y recalcular el esperado antes de ejecutar. | Entrega informada por el usuario; ruta y criterios del APK por confirmar. | Pendiente de alcance | — |
| CP-HU77-01 | Crear auxiliar de 10 USD; registrar tasa r/fecha; guardar, reabrir y revisar Reportes; cambiarla a 199 MXN y volver a revisar; retirar auxiliar. | Equivalente round(10*r,2) MXN, original conservado y sumado una sola vez; al pasar a MXN reemplaza por 199 y limpia original/tasa. | Selector de moneda visible; conversión sin ejecutar. | Pendiente | — |
| CP-HISTORIAL-01 | Abrir historial vacío de una auxiliar; marcar pagada una vez; revisar historial, próxima fecha y Reportes; reabrir. | Historial pasa de vacío a un pago por el costo, fecha e importe correctos; avanza un ciclo; persistencia y ninguna alta duplicada como gasto variable. | Historial vacío visible en A/B; falta registrar un pago en una auxiliar. | Pendiente | — |

## Alcance, bloqueos y no incluidas

No incluidas: **ninguna según la declaración del usuario de que todas están
completadas en el tablero**. Falta adjuntar referencia/estado del tablero e
identificar el build instalado para acreditar la correspondencia. Costo
compartido queda pendiente de localizar/confirmar criterios en el APK; no se
clasifica como no incluida por ausencia de evidencia.

Si falta una dependencia para ejecutar, registrar motivo, casos afectados,
acción necesaria y seguimiento en Daily. Si la mejora no entró al corte,
registrar HU, estado del tablero y evidencia de la decisión en esta sección.

## Dictamen y seguimiento

- Casos base: **7 Pasa y 5 pendientes**.
- Casos adicionales: **1 Falla y 3 pendientes**.
- Casos funcionales ejecutados de esta matriz: **8 de 16**.
- Resultado acumulado del APK **1.0.1/versionCode 2**: **7 Pasa, 1 Falla,
  8 pendientes**. El APK posterior todavía no tiene dictamen en esta ejecución.
- **HU79-BUG-01**, severidad Media: **corrección reportada por el usuario en
  APK posterior; reprueba diferida por indicación del usuario**. Responsable
  de seguimiento por asignar.
- Aviso al usuario en esta conversación: fallo del próximo cobro de Cartera
  comunicado el 2026-11-18. Asignación/notificación al responsable del equipo
  pendiente; no se enviaron mensajes ni se actualizó el tablero.
- Apoyo automático local: 570/570 mobile y 84/84 membresías/Reportes pasaron
  durante la preparación; [detalle](hu79-entorno-android.md).
- Corte original 2026-11-11 y entrega 2026-11-15 ya transcurrieron. Registrar la
  ejecución con su fecha real y separar cualquier incorporación posterior.
- HU-62: enlazar aquí el reporte final cuando exista; sin actualización automática.
- Revisión del PO y cierre de Luis Dorian: pendientes.

Para cada falla, crear un bug con la [plantilla](../plantilla-reporte-bug.md),
enlazarlo desde todos los casos afectados y registrar responsable según el acuerdo
del equipo. Mantener resultados previos y añadir reprueba con fecha/evidencia.
