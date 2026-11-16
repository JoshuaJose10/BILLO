# Lista de requisitos funcionales — Billo

Actualización: 2026-11-15, America/Mexico_City. La columna histórica procede de
[métricas de Sprint 2](metricas.md); no constituye una repetición en el APK HU-53.
El dictamen actual y sus evidencias están en el
[reporte de entrega](qa/entrega-rf7-rf9-rf10-reporte.md).
La ampliación RF11–RF13 se revisa por separado en el
[reporte HU-79](qa/hu61-reporte.md), con ejecución manual reportada y 19 SS incorporadas.

RF1–RF10 quedan aprobados por indicación del usuario el 2026-11-14, quien informó
que los bugs nuevos de la revisión se corrigieron en otra tarea. Posteriormente
reportó la ejecución de las pruebas y aportó este [Video de pruebas en Android](https://youtube.com/shorts/e79WO_K3lpY?feature=share) como evidencia
conjunta. El enlace está asociado a cada caso en el reporte; sus resultados
individuales y cobertura quedan por confirmar, ya que no fue posible abrir la
grabación desde esta revisión. No se acredita una firma de QA/PO.

| RF | Requisito | QA histórico Sprint 2 | Decisión de esta entrega sobre HU-53 |
|---|---|---|---|
| RF1 | Registro e inicio de sesión | Aprobado según métricas | **APROBADO por indicación del usuario**; API equivalente pasa; regresión reportada con video; resultado individual por confirmar |
| RF2 | Registrar gasto diario | Aprobado según métricas | **APROBADO por indicación del usuario**; API equivalente pasa; regresión reportada con video; resultado individual por confirmar |
| RF3 | Presupuesto mensual por categoría | Aprobado según métricas | **APROBADO por indicación del usuario**; API equivalente pasa; regresión reportada con video; resultado individual por confirmar |
| RF4 | Alerta de presupuesto | Aprobado según métricas | **APROBADO por indicación del usuario**; API equivalente pasa; regresión reportada con video; resultado individual por confirmar |
| RF5 | Gestión de membresías | Aprobado según métricas | **APROBADO por indicación del usuario**; API equivalente pasa; regresión reportada con video; resultado individual por confirmar |
| RF6 | Gasto total mensual | Aprobado según métricas | **APROBADO por indicación del usuario**; API equivalente pasa; regresión reportada con video; resultado individual por confirmar |
| RF7 | Avisos de cobro | Pendiente | **APROBADO por indicación del usuario**; video asociado a 6 casos; resultados por confirmar |
| RF8 | Gráficas por categoría | Aprobado según métricas | **APROBADO por indicación del usuario**; API equivalente pasa; regresión reportada con video; resultado individual por confirmar |
| RF9 | Catálogo del administrador | Pendiente | **APROBADO por indicación del usuario**; corrección informada en otra tarea; video asociado a 4 casos; resultados por confirmar |
| RF10 | Modo visitante | Pendiente | **APROBADO por indicación del usuario**; video asociado a 5 casos; resultados por confirmar |
| RF11 | Cambio de moneda (gastos y suscripciones) | Fuera del alcance histórico | **APROBADO por indicación del usuario (HU-79)** el 2026-11-15: seis Pasa declarados sin SS; evidencia y verificación independiente no acreditadas |
| RF12 | Captura de gastos por voz | Fuera del alcance histórico | **APROBADO por indicación del usuario (HU-79)** el 2026-11-15: dos Pasa reportados y 5 SS revisadas; valores/variantes descritos en el reporte |
| RF13 | Widget Android del total mensual | Fuera del alcance histórico | **APROBADO por indicación del usuario (HU-79)** el 2026-11-15: cuatro Pasa reportados y 14 SS; CP-RF13-02 con cobro posterior sin deuda, total 0 correcto según aclaración del usuario; sin bugs abiertos |

## Aprobaciones registradas por indicación del usuario

- [x] RF7 aprobado por indicación del usuario el 2026-11-14.
- [x] RF9 aprobado por indicación del usuario el 2026-11-14.
- [x] RF10 aprobado por indicación del usuario el 2026-11-14.

Completar resultados reales por caso, archivos de SS asociados, nombre y fecha de
QA en el reporte. Las casillas anteriores registran la decisión solicitada y
no sustituyen la revisión de los resultados.

## Aprobaciones registradas de RF11–RF13 (HU-79)

Formato de evidencia manual desde el 2026-11-15: SS PNG/JPG por caso y paso;
para el reinicio del widget, capturas antes/después y bitácora del ejecutor.

- [x] RF11 aprobado por indicación del usuario el 2026-11-15; sin SS adjuntas.
- [x] RF12 aprobado por indicación del usuario el 2026-11-15; SS incorporadas.
- [x] RF13 aprobado por indicación del usuario el 2026-11-15; aclarada la variante de cobro posterior de CP-RF13-02, sin bugs abiertos.
- [ ] Completar trazabilidad del build, evidencia de continuidad sin red y revisión formal QA/PO.

Las suites automáticas pasaron (mobile 387/387 y backend 418/418) el 2026-11-14,
pero no sustituyen la ejecución en Android físico con el APK HU-53. El usuario
reportó todos los casos Pasa y solicitó las aprobaciones. En CP-RF13-02 aclaró
que el cobro de la suscripción de 100 estaba programado para después y aún no
generaba deuda; el total 0 es correcto para esa variante. El reporte registra
12 Pasa reportados y 0 Fallas. Las casillas de aprobación por indicación del usuario no acreditan
una firma independiente de QA/PO ni completan la evidencia faltante de RF11.
Estas decisiones no modifican las aprobaciones RF1–RF10 anteriores.
