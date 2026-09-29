# Definition of Done — Billo

## Flujo de estados de una tarea
Pendiente → En progreso → En revisión (PR abierto hacia develop) → En QA → Completa

## Pendiente → En progreso
El responsable empieza a trabajar y mueve la tarjeta en ClickUp.

## En progreso → En revisión
- El código está en una rama `feature/` o `fix/` creada desde `develop`.
- `npm run lint` pasa sin errores.
- Se abrió un Pull Request hacia `develop` con la plantilla llena.

## En revisión → En QA
- Otro desarrollador (no el autor) revisó y aprobó el PR en menos de 24 horas.

## En QA → Completa
- Luis Dorian (QA) ejecutó los casos del plan de pruebas correspondientes.
- No quedan bugs críticos ni altos abiertos.
- QA dejó por escrito "QA aprobado" en el PR y en la tarea de ClickUp.
- El líder fusionó el PR a `develop`.

## Si QA rechaza
- La tarea regresa a "En progreso" con el bug enlazado desde ClickUp.
- El desarrollador tiene 24 horas para corregirlo y volver a pedir revisión de QA.

## Tareas sin código (documentos)
Se aprueban cuando QA (o el líder, si QA es quien hizo el documento) revisa los "Criterios de calidad" escritos en la propia tarea de ClickUp y confirma que se cumplen.

## Sobre main
`main` solo recibe código cuando el líder fusiona `develop` → `main`, al cierre de cada sprint. Ningún PR individual apunta directo a `main`.
