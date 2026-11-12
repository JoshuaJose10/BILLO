# BUG-01 — [RF5] La fecha de cobro recurrente permanece vencida

- Caso(s): D8 y presentación de D3 del [reporte Sprint 2](../../app-sprint2-reporte.md).
- Historia / tarea: HU-36 (membresías), [HU-51 (corrección y reprueba)](#hu-51).
- Severidad: Media (clasificación del reporte original).
- Estado: Pendiente de reprueba en Android; existe implementación de corrección.
- Responsable: Por asignar.
- Fecha del hallazgo histórico: 2026-11-05, según la ficha de HU-40.
- Fecha de registro de esta ficha: 2026-11-11.
- Fecha de corrección: Por confirmar en el seguimiento de HU-51.

## Ambiente

- Hallazgo original: `develop`, referencia `64013bd` indicada por el reporte; commit exacto de aquella ejecución no confirmado.
- API: `http://localhost:3100`, PostgreSQL 16, según el reporte original.
- Cliente original: export web / Chromium, viewport 412×915, agente Android; sin Android físico.
- Base local al preparar la reprueba: `develop` @ `dd35bed`, Billo 1.0.0 / Expo SDK 58.
- Reprueba: Expo Go en Android físico; faltan modelo, versión de Android, versión de Expo Go, API y commit realmente usados.

## Precondiciones

Cuenta de QA autenticada y API accesible. Crear una membresía mensual aislada para no confundir el encabezado de próximo cobro con otra suscripción.

## Pasos para reproducir

1. En una cuenta de QA sin otras membresías, ir a Cartera → Suscripciones → Agregar.
2. Introducir nombre `QA BUG-01`, costo `199`, frecuencia Mensual y una fecha de cobro de hace 30 días usando el selector nativo. Registrar la fecha del teléfono y la fecha elegida.
3. Guardar y observar la fecha y el texto de la fila y el encabezado «Próximo cobro».
4. Cambiar de pantalla y volver a Cartera para comprobar que ambos muestran el mismo ciclo.
5. Si la prueba se ejecuta el 2026-11-11, usar `2026-10-12`: el siguiente cobro mensual esperado es `2026-11-12`. En otra fecha, recalcular los datos.

## Resultado esperado

La fecha mensual avanza por ciclos hasta hoy o una fecha futura. La fila, los días restantes y el encabezado muestran ese ciclo vigente, y el costo mensual sigue siendo 199. La [reprueba D8](../../app-sprint2-reporte.md#10-android-real) evalúa este comportamiento actual de HU-51.

## Resultado obtenido

El reporte del navegador documentó «Venció hace 29 días» y un encabezado «Próximo cobro» con fecha pasada. Es un hallazgo histórico: no se ha confirmado su reproducción ni su corrección en el Android de esta ejecución.

## Evidencia

- [D8 del navegador](../../hu40-evidencias/D8.png).
- [D3 del navegador](../../hu40-evidencias/D3.png), citado por la tabla original de bugs.
- Android pendiente: guardar `D8-fecha.png` y `D8-lista.png` en [la carpeta de esta ejecución](../../hu40-evidencias/android-real/README.md) y enlazarlos aquí después de capturarlos.
- Usar cuentas de QA; omitir contraseñas, tokens y credenciales reales.

## HU-51

Esta ficha relaciona **BUG-01 → HU-51**, responsable de avanzar al siguiente ciclo de cobro. Referencias de implementación existentes:

- [Cálculo del ciclo y ajuste de membresías](../../../mobile/src/utils/membresias.js): `avanzarFechaCobro` y `ajustarAlSiguienteCiclo`, identificados como HU-51 / BUG-01 en el código.
- [Servicio móvil](../../../mobile/src/services/membresias.js): aplica el ajuste al leer las membresías.
- [Proceso de avisos del backend](../../../backend/src/jobs/avisoCobros.js): avance de fechas asociado a HU-51.

**Enlace externo de HU-51 / bug en ClickUp: pendiente de incorporar.** No se dispone de una URL específica en el repositorio; esta ficha no acredita la creación ni la vinculación de una tarea en ClickUp.

## Reprueba

- Commit corregido: Por confirmar; código de corrección presente en la base `dd35bed`.
- Fecha y quién probó: Pendiente.
- Modelo / Android / Expo Go / API: Pendiente.
- Resultado: Pendiente.
- Resultado observado (fila, encabezado y costo mensual): Pendiente.
- Evidencia Android: Pendiente.
