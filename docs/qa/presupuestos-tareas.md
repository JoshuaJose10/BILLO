# Seguimiento de bugs — QA presupuestos

Archivo local de tareas conforme a la [plantilla del proyecto](../plantilla-reporte-bug.md). No implica que exista un ticket externo en ClickUp.

## QA-PRES-01 — Conservar y mostrar el aviso de presupuesto

- Bug: [PRES-QA-01](bugs/PRES-QA-01-aviso-mobile.md).
- Historia: HU-29 / RF4. Bloquea el aprobado integral de alertas.
- Prioridad: Alta.
- Severidad: Alta.
- Estado: Abierto.
- Responsable: **Fernando Villafuerte**, confirmado por el solicitante el 2026-11-03.
- Revisa QA: **Joshua**.
- Fecha de alta: 2026-11-03.
- Fecha de corrección: Por acordar.

Trabajo y aceptación:

- [ ] Conservar en el servicio móvil el aviso recibido de POST y PUT, sin perder los datos del gasto.
- [ ] Consumirlo en el guardado de Nuevo gasto/edición y mostrar el aviso correspondiente a `alerta` o `excedido`.
- [ ] Mantener ausencia de aviso cuando no hay presupuesto o el estado es `ok`.
- [ ] Repetir `npm run qa:presupuestos`; la comprobación del adaptador debe pasar, además de las 49 pruebas API y las 174 peticiones de Newman.
- [ ] Verificar en Android 79,99 %, 80 %, 100 % y 100,01 %, para creación y edición, sin duplicar el gasto ni alterar los datos de otro mes/usuario.
- [ ] Adjuntar evidencia nueva y obtener la confirmación independiente de Joshua en el reporte.

La corrección del producto queda fuera de esta entrega de pruebas y reporte; la tarea ya tiene responsable y reproducción concreta para su atención.
