# [RF5 / HU-75] Cartera conserva como próximo cobro la fecha de una suscripción pausada

- Bug: HU79-BUG-01
- Caso: CP-HU75-01
- Historia / tarea: HU-79, QA de mejoras de suscripciones; pausa de HU-75.
- Severidad: Media
- Estado: Corrección reportada en APK posterior; reprueba diferida por indicación del usuario
- Responsable: Por asignar
- Fecha de reporte: 2026-11-18, America/Mexico_City
- Fecha de corrección: No informada; aclaración recibida el 2026-11-18

## Ambiente

- APK instalado: Billo `com.billo.app`, versión 1.0.1, versionCode 2.
- Samsung SM-A530F, Android 9, ADB por USB.
- API y commit del binario: no identificados.
- Repositorio de referencia: rama `develop`, commit
  `130d0500d3fafecf6080020260e274bfc28b946c`. No se afirma que sea el commit del APK.
- Ejecución visual: 2026-11-18, 02:30–02:33, America/Mexico_City.

## Precondiciones

Cuenta QA Dorian con estas suscripciones activas, sin gastos variables:

| Suscripción | Frecuencia | Costo MXN | Próximo cobro |
|---|---|---:|---|
| Prueba Mes 1 | Mensual | 100.00 | 2026-11-20 |
| Prueba 2 Anuam | Anual | 1200.00 | 2026-11-22 |
| Prueba 2 Anual 2 | Anual | 2400.00 | 2026-12-20 |

## Pasos para reproducir

1. Abrir Cartera → Suscripciones y comprobar mensualizado 400, anual 4800 y
   cobros del mes 1300.
2. Abrir Prueba Mes 1 y pulsar Pausar suscripción.
3. Observar el texto Próximo cobro de la tarjeta Total mensual.
4. Abrir Inicio: su tarjeta Próximo cobro cambia a Prueba 2 Anuam, a cuatro días.
5. Volver a Cartera y comparar su fecha con Inicio.
6. Cerrar el proceso de Billo, volver a abrir y entrar a Cartera → Suscripciones.

## Resultado esperado

La fecha del próximo cobro activo pasa a **22 de noviembre**. La suscripción
pausada no se presenta como siguiente cobro. Referencia: [pausa/reactivación
del contrato v1.11](../../api-contrato.md#post-membresiasidpausar--requiere-token-hu-75)
y [caso CP-HU75-01](../hu79-suscripciones-reporte.md).

## Resultado obtenido

La mensual aparece Pausada y los cálculos se actualizan correctamente a
300 mensualizados, 3600 anuales y 1200 de cobros del mes. Reportes muestra
variable 0, fijo 300 y total 300. Inicio identifica correctamente el siguiente
cobro de 1200 a cuatro días.

Sin embargo, Cartera conserva **Próximo cobro el 20 nov**, la fecha de la mensual
pausada. Persiste al navegar fuera y volver, y tras cerrar y reabrir el proceso.
Al terminar la prueba se reactivaron las suscripciones; la base quedó restaurada.

## Evidencia

- [A pausada, totales descontados y fecha 20 nov incorrecta](../hu79-evidencias/CP-HU75-01/02-pausa-20261118T083015278Z-dd02ae.png).
- [Inicio muestra la siguiente activa a cuatro días](../hu79-evidencias/CP-HU75-01/03-inicio-pausada-20261118T083036681Z-4a97fc.png).
- [Reportes 0/300/300](../hu79-evidencias/CP-HU75-01/05-reportes-pausada-20261118T083111780Z-a7ef21.png).
- [Fallo persistente tras cerrar y reabrir](../hu79-evidencias/CP-HU75-01/08-pausa-tras-reabrir-20261118T083243007Z-a191be.png).
- [Base restaurada al reactivar](../hu79-evidencias/CP-HU75-01/09-restauradas-20261118T083246890Z-624d79.png).

## Reprueba

- Corrección reportada: el usuario aclaró el 2026-11-18 que el defecto ya se
  corrigió en una versión más nueva del APK. Esta declaración corresponde a un
  binario posterior al 1.0.1/versionCode 2 evaluado aquí.
- APK corregido / versión / build: Por identificar.
- Commit corregido: Por identificar.
- Fecha y quién probó el APK corregido: Pendiente.
- Resultado: No ejecutada; el usuario indicó el 2026-11-18 que no quiere repetir el caso en este momento.
- Evidencia: Pendiente.

El fallo y las capturas anteriores se conservan como resultado del APK probado.
Para cerrar la reprueba, instalar el binario corregido, identificar su versión
y repetir CP-HU75-01. Si pasa, añadir el resultado y las nuevas capturas sin
reemplazar la evidencia de la ejecución original.
