# [RF13] El widget Billo ya no expone el total mensual exigido por el caso

- Caso(s): CP-RF13-01, CP-RF13-02.
- Historia / tarea: QA final integral; cierre HU-61.
- Severidad: Media.
- Estado: Abierto; requiere decidir contrato de producto frente al plan vigente.
- Responsable: Por asignar.
- Fecha de reporte: 2026-11-19.
- Fecha de corrección: Por acordar.

## Ambiente

- Rama `test/qa-final`; commit del APK `6281015ba698ec523bb4c6d99672c230788e0d75`.
- API `https://billo-api-v30t.onrender.com`.
- Samsung Galaxy A8 SM-A530F, Android 9; release 1.0.0, versionCode 2.
- SHA-256 `9b76fce17ebf481784fd8dfaa304bb65b3b9650ff709ab013279791f052f2f08`.

## Precondiciones

QA A: ingresos 1500, gastos variables 266.26, sin suscripciones; widget Billo
agregado. Total inicial 266.26, saldo disponible 1233.74.

## Pasos para reproducir

1. Ver Inicio y el widget.
2. Crear `QA Widget Exigible`, costo 100 MXN, mensual, «Aún no la pago»,
   fecha de cobro 2026-11-19.
3. Abrir Inicio y volver al launcher sin quitar/reagregar el widget.
4. Consultar `/reportes/resumen?mes=2026-11` y eliminar la suscripción.

## Resultado esperado

El plan vigente CP-RF13-01/02 exige mostrar mes y total mensual, y pasar de
T a T+100 con una suscripción exigible, volviendo a T al eliminarla.

## Resultado obtenido

API e Inicio reflejan variable 266.26, fijo 100, total 366.26. Billo muestra
«Saldo disponible» 1233.74 antes y después, sin total mensual ni mes explícito.
Los gastos sí modifican ese saldo en sentido inverso: 1153.74 al crear 80,
1138.24 al editar a 95.50, y 1233.74 al borrar.

La interfaz y el código actual calculan intencionalmente ingresos menos gastos
variables. No se atribuye una suma incorrecta a ese saldo: hay una divergencia
entre el widget actual y la aceptación vigente. Joshua debe acordar si se
restaura el total/mes requerido o se actualiza el contrato y se reprueba el
widget correspondiente. QA no aprueba unilateralmente otro criterio.

## Evidencia

- [Base](../qa-final-evidencias/RF13-01-widget-base.png).
- [Gasto 80](../qa-final-evidencias/RF13-02-widget-mas-80.png).
- [Edición 95.50](../qa-final-evidencias/RF13-02-widget-editado-95-50.png).
- [Inicio con cobro exigible](../qa-final-evidencias/RF13-02-inicio-cobro-exigible.png).
- [Widget con cobro exigible](../qa-final-evidencias/RF13-02-widget-mas-100.png).
- [Fecha y totales API](../qa-final-evidencias/RF13-02-cobro-exigible.json).
- [Después de eliminar](../qa-final-evidencias/RF13-02-widget-suscripcion-eliminada.png).

## Reprueba

- Commit corregido: Pendiente.
- Fecha y quién probó: Pendiente.
- Resultado: Pendiente.
- Evidencia: Pendiente.
