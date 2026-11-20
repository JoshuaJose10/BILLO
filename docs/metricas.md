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
| Bases (28 sep – 2 oct) | 15 de 15 (100 %) | 11 de 15 (73 %) | — | 0 | Sin dato |
| Sprint 1 (8 – 21 oct) | 15 de 15 (100 %) | 8 de 14 (57 %) | Base de RF1 y RF2 (API de auth y gastos) | 0 | Por confirmar con Luis |
| Sprint 2 (23 oct – 4 nov) | 32 de 32 (100 %) | 15 de 32 (47 %) | 7 de 10 (RF1–RF6 y RF8) | 0 críticos y 0 altos conocidos; 1 medio (BUG-01, corregido en HU-51) | Por confirmar con Luis |
| Sprint 3 (6 – 13 nov; cierre real 18 nov) | 57 de 63 (90 %) al 18 nov; las 6 restantes son QA final, entrega y APK | 47 de 57 (82 %), ver nota | 13 de 13 implementados (RF1–RF13); RF1–RF10 aprobados por indicación del PO | 0 conocidos | Por confirmar con Luis |

Fuente: ClickUp (listas de cada sprint) y repositorio, consultados el 2026-11-18. «A tiempo» compara el día en que la tarea pasó a *completa* con su fecha límite (hora de Ciudad de México); las tareas sin fecha límite no cuentan. Los sprints se midieron con el mismo método; por eso el Sprint 2 pasa de 14 de 31 (45 %, corte del 5 nov) a 15 de 32 (47 %) al incluir HU-41.

**Nota del Sprint 3:** el 16 y 17 de nov se agregaron tareas nuevas (tarjetas, reportes de ingresos y balance, perfil, widgets, ingresos recurrentes) y se reprogramaron al 18 de nov las fechas límite de varias tareas que seguían abiertas, de modo que el 82 % queda por arriba de lo que habría salido con las fechas originales.

## Comparativo de sprints

| Sprint | Tareas cerradas | Días planeados | Días reales de trabajo | Tareas por día (real) | Cerradas después del fin planeado | Atraso medio |
|---|---|---|---|---|---|---|
| Bases | 15 | 5 | 4 | 3.8 | 0 | 0.3 días |
| Sprint 1 | 15 | 14 | 14 | 1.1 | 2 | 0.9 días |
| Sprint 2 | 32 | 13 | 14 | 2.3 | 4 | 1.2 días |
| Sprint 3 | 57 (+6 abiertas) | 8 | 11 | 5.2 | 23 | 0.3 días |

- **Más rápido:** las **Bases** (terminaron un día antes de lo planeado). Por volumen, el **Sprint 3** fue el de mayor ritmo, con 5.2 tareas por día.
- **Más costosos:** el **Sprint 3** (63 tareas, la mayor carga; se extendió 5 días más allá del plan de una semana y 23 tareas cerraron después del 13 nov) y el **Sprint 2** (32 tareas, 53 % entregadas tarde y el mayor atraso medio, 1.2 días). El **Sprint 1** fue el de menor ritmo (1.1 tareas por día) y cerró 2 tareas después de su fecha final.
- **Limitación:** ClickUp no tiene registro de horas en este proyecto, así que el «costo» se mide en tareas, días y atraso, no en horas.

## Detalle del Sprint 2

Fuente: lista «Sprint 2 — 23 oct al 4 nov» de ClickUp (32 tareas) y PR del repo, consultados el 2026-11-05. Las cifras se redondean al entero.

- **Avance:** 31 tareas completas de 32. Falta HU-41 (este cierre).
- **Entregas a tiempo:** se compara el día en que la tarea pasó a *completa* con su fecha límite (hora de Ciudad de México). 14 de 31 llegaron a tiempo; 17 tardaron entre 1 y 5 días. *Completa* solo la marca Luis Dorian después de QA, así que la cifra mide también la espera de QA, no solo el desarrollo. Está por debajo de la meta de 90 %.
- **Cobertura de requisitos:** 7 de 10 (RF1–RF6 y RF8) con QA aprobado. Faltan RF7 (avisos de cobro), RF9 (catálogo de administrador) y RF10 (modo visitante), planeados para el Sprint 3. RF11 a RF13 son ampliaciones y no cuentan en el 10.
- **Bugs abiertos:** ninguno crítico ni alto en los reportes de QA. Abierto: BUG-01 (medio): el cobro de una membresía con fecha vencida no avanza al siguiente ciclo (`docs/app-sprint2-reporte.md`).
- **Tasa de rechazo de QA:** sin dato fiable en este documento; Luis la calcula con el historial de estados de ClickUp antes de la retro.
- **Tiempo de revisión de PR:** de los 31 PR abiertos entre el 23 oct y el 5 nov, 16 tienen revisión o comentario registrado en GitHub: mediana 2.8 h y 15 de 16 dentro de 24 h (el más tardado, #35, 41 h). Los otros 15 se fusionaron sin revisión registrada en GitHub; la meta de revisión por otra persona no se puede comprobar en ellos.

**Pendiente de QA (criterio de HU-41):** Luis confirma que estas cifras coinciden con ClickUp y con sus reportes y completa la tasa de rechazo.
