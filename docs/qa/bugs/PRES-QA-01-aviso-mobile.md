# [RF4] El móvil descarta el aviso de presupuesto al crear o editar un gasto

- Caso(s): CP-RF4-01, CP-RF4-02, CP-RF4-L80, CP-RF4-L100, CP-RF4-L10001; RF4-MOBILE-POST/PUT-alerta/excedido.
- Historia / tarea: HU-29, RF4; [QA-PRES-01 — conservar y mostrar el aviso](../presupuestos-tareas.md#qa-pres-01--conservar-y-mostrar-el-aviso-de-presupuesto).
- Severidad: **Alta**. Impide el aviso oportuno de una función principal; el gasto sí se guarda.
- Estado: **Abierto**.
- Responsable: **Fernando Villafuerte**, asignación confirmada por el solicitante el 2026-11-03.
- Fecha de reporte: 2026-11-03.
- Fecha de corrección: Por acordar.

## Ambiente

- Rama y commit: `test/qa-presupuestos`, base `develop` / `58ac43e6722d9b2600b1be136c302e30e6a27660`; hashes ejecutados en la evidencia.
- API / ambiente de pruebas: Express real, PostgreSQL temporal; la reproducción del adaptador usa transporte y React aislados.
- Sistema operativo y Node: Windows, Node 22.15.0. Sin ejecución en un dispositivo Android.
- Versión app / Postman / Newman: mobile 1.0.0; Newman 6.2.3.

## Precondiciones

Usuario QA, categoría de gasto disponible y presupuesto de esa categoría de 1000 para noviembre de 2026. No hay otros gastos de ese usuario/categoría/mes. La API ya devuelve `alerta` según el contrato.

## Pasos para reproducir

Reproducción ejecutada del adaptador real, desde `backend`:

1. Ejecutar `node --experimental-vm-modules qa/verificar-alertas-mobile.cjs`.
2. El ejecutor carga el módulo real `mobile/src/services/gastos.js` y entrega a `crearGasto` y `actualizarGasto` respuestas de API con gasto 800 y aviso `{ "categoria_id": 1, "porcentaje": 80, "estado": "alerta" }`.
3. Repite con gasto 1000.01 y aviso `{ "categoria_id": 1, "porcentaje": 100, "estado": "excedido" }`.
4. Comprobar `apiResponse` y `serviceResult` de los cuatro fallos. La respuesta recibida contiene el aviso, pero el resultado del servicio contiene únicamente los campos del gasto.

Para validar posteriormente en Android (pendiente, no ejecutado): crear el presupuesto, guardar un gasto 800 en esa categoría y comprobar el aviso; editarlo a 1000.01 y comprobar el aviso de excedido. Repetir con los acumulados 700+100 y 950+100 de los CP originales.

## Resultado esperado

Conforme a [CP-RF4-01/02](../../plan-de-pruebas.md) y al [contrato de alertas](../../api-contrato.md#aviso-al-registrar-un-gasto-campo-alerta), el aviso recibido debe quedar disponible y mostrarse después de guardar. El gasto se persiste una sola vez. Al 100 % sigue siendo `alerta`; por encima es `excedido`.

## Resultado obtenido

El servicio desestructura únicamente `{ gasto }` y devuelve `normalizarGasto(gasto)` en ambos métodos; elimina `alerta`. La inspección de `NuevoGastoScreen.confirmar` muestra que se espera la operación y se cierra la hoja sin consumir la respuesta ni presentar un aviso.

La comprobación ejecutada obtiene **2 casos correctos de ausencia de aviso y 4 fallidos de conservación del aviso**; salida 1. La API real pasa los casos de aviso en POST, PUT y GET. No se atribuye el fallo al cálculo ni se afirma haber observado la pantalla en un dispositivo.

## Evidencia

- [JSON sanitizado](../presupuestos-resultados.json), campos `mobile.results` (entrada y salida reales del adaptador) y `executions` (respuestas de API).
- [Servicio afectado](../../../mobile/src/services/gastos.js) y [consumidor inspeccionado](../../../mobile/src/screens/NuevoGastoScreen.js).
- [Reporte QA presupuestos](../presupuestos-reporte.md).

## Reprueba

- Commit corregido: Pendiente.
- Fecha y quién probó: Pendiente; confirmación final de Joshua.
- Resultado: **Pendiente**.
- Evidencia: Pendiente. Repetir la comprobación del servicio, toda la QA y el flujo visual Android; conservar esta ejecución como antecedente.
