# Métricas de seguimiento — Billo

| Métrica | Cómo se calcula | Meta |
|---|---|---|
| Avance del sprint | Tareas completas ÷ tareas del sprint | 100 % al cierre |
| Entregas a tiempo | Tareas completas antes de su fecha ÷ tareas completas | 90 % o más |
| Cobertura de requisitos | RF aprobados por QA ÷ 10 | Crece cada sprint |
| Bugs abiertos por severidad | Conteo de críticos, altos, medios y bajos | 0 críticos y 0 altos al cierre |
| Tasa de rechazo de QA | Tareas devueltas por QA ÷ tareas enviadas a QA | Menos de 25 % |
| Tiempo de revisión de PR | Horas desde que se abre hasta la primera revisión | Menos de 24 h |

## Registro por sprint

| Sprint | Avance | Entregas a tiempo | RF cubiertos | Bugs críticos/altos abiertos | Rechazos QA |
|---|---|---|---|---|---|
| Bases (semana 1) | | | — | | |
| Sprint 1 | | | | | |
| Sprint 2 (23 oct – 4 nov) | 31 de 32 (97 %); 32 de 32 al cerrar HU-41 | 14 de 31 (45 %) | 7 de 10 (RF1–RF6 y RF8) | 0 críticos y 0 altos conocidos; 1 medio (BUG-01) | Por confirmar con Luis |

## Detalle del Sprint 2

Fuente: lista «Sprint 2 — 23 oct al 4 nov» de ClickUp (32 tareas) y PR del repo, consultados el 2026-11-05. Las cifras se redondean al entero.

- **Avance:** 31 tareas completas de 32. Falta HU-41 (este cierre).
- **Entregas a tiempo:** se compara el día en que la tarea pasó a *completa* con su fecha límite (hora de Ciudad de México). 14 de 31 llegaron a tiempo; 17 tardaron entre 1 y 5 días. *Completa* solo la marca Luis Dorian después de QA, así que la cifra mide también la espera de QA, no solo el desarrollo. Está por debajo de la meta de 90 %.
- **Cobertura de requisitos:** 7 de 10 (RF1–RF6 y RF8) con QA aprobado. Faltan RF7 (avisos de cobro), RF9 (catálogo de administrador) y RF10 (modo visitante), planeados para el Sprint 3. RF11 a RF13 son ampliaciones y no cuentan en el 10.
- **Bugs abiertos:** ninguno crítico ni alto en los reportes de QA. Abierto: BUG-01 (medio): el cobro de una membresía con fecha vencida no avanza al siguiente ciclo (`docs/app-sprint2-reporte.md`).
- **Tasa de rechazo de QA:** sin dato fiable en este documento; Luis la calcula con el historial de estados de ClickUp antes de la retro.
- **Tiempo de revisión de PR:** de los 31 PR abiertos entre el 23 oct y el 5 nov, 16 tienen revisión o comentario registrado en GitHub: mediana 2.8 h y 15 de 16 dentro de 24 h (el más tardado, #35, 41 h). Los otros 15 se fusionaron sin revisión registrada en GitHub; la meta de revisión por otra persona no se puede comprobar en ellos.

**Pendiente de QA (criterio de HU-41):** Luis confirma que estas cifras coinciden con ClickUp y con sus reportes y completa la tasa de rechazo.
