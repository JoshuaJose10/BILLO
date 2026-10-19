# Checklist de pruebas — Billo RF1–RF8

Fuente: [plan de pruebas](plan-de-pruebas.md), sección 5. Se conservan sus IDs, precondiciones, pasos y resultados esperados. Los 23 casos existentes ya cubren los ocho requisitos; no fue necesario agregar casos al plan.

## Uso diario

1. Copiar esta tabla para cada entrega o ejecución, conservando los IDs. Anotar rama/commit, ambiente, dispositivo y enlace a las evidencias.
2. Ejecutar los pasos del plan y registrar **Pasa** o **Falla**, fecha en formato YYYY-MM-DD y nombre de quien probó. **Pendiente** significa que no se ejecutó. **Bloqueado** requiere explicar el impedimento y las dependencias; no equivale a Pasa ni a Falla.
3. Si falla, crear un reporte por defecto usando la [plantilla de bugs](plantilla-reporte-bug.md), clasificarlo con [criterios de calidad](criterios-calidad.md) y pegar el enlace en la fila. Reutilizar el mismo bug si afecta varios casos. No incluir contraseñas, tokens ni credenciales reales en evidencias.
4. Conservar el resultado original y añadir otra ejecución al repetir una prueba después de corregir un bug.

Entrega/PR: —

Rama y commit: —

Ambiente y URL de API: —

Dispositivo / versión de Android: —

Evidencia de ejecución: —

| Caso | Historia | Resultado (Pasa / Falla) | Fecha | Quién | Enlace al bug si falló |
|---|---|---|---|---|---|
| CP-RF1-01 | RF1. Registro e inicio de sesión | Pendiente | — | — | — |
| CP-RF1-02 | RF1. Registro e inicio de sesión | Pendiente | — | — | — |
| CP-RF1-03 | RF1. Registro e inicio de sesión | Pendiente | — | — | — |
| CP-RF1-04 | RF1. Registro e inicio de sesión | Pendiente | — | — | — |
| CP-RF2-01 | RF2. Registrar gasto diario | Pendiente | — | — | — |
| CP-RF2-02 | RF2. Registrar gasto diario | Pendiente | — | — | — |
| CP-RF2-03 | RF2. Registrar gasto diario | Pendiente | — | — | — |
| CP-RF3-01 | RF3. Presupuesto mensual por categoría | Pendiente | — | — | — |
| CP-RF3-02 | RF3. Presupuesto mensual por categoría | Pendiente | — | — | — |
| CP-RF4-01 | RF4. Alerta de presupuesto | Pendiente | — | — | — |
| CP-RF4-02 | RF4. Alerta de presupuesto | Pendiente | — | — | — |
| CP-RF4-03 | RF4. Alerta de presupuesto | Pendiente | — | — | — |
| CP-RF5-01 | RF5. Gestión de membresías | Pendiente | — | — | — |
| CP-RF5-02 | RF5. Gestión de membresías | Pendiente | — | — | — |
| CP-RF5-03 | RF5. Gestión de membresías | Pendiente | — | — | — |
| CP-RF5-04 | RF5. Gestión de membresías | Pendiente | — | — | — |
| CP-RF6-01 | RF6. Gasto total mensual | Pendiente | — | — | — |
| CP-RF6-02 | RF6. Gasto total mensual | Pendiente | — | — | — |
| CP-RF7-01 | RF7. Notificación de cobro | Pendiente | — | — | — |
| CP-RF7-02 | RF7. Notificación de cobro | Pendiente | — | — | — |
| CP-RF7-03 | RF7. Notificación de cobro | Pendiente | — | — | — |
| CP-RF8-01 | RF8. Gráficas por categoría | Pendiente | — | — | — |
| CP-RF8-02 | RF8. Gráficas por categoría | Pendiente | — | — | — |

## Cobertura

| Requisito | Casos del plan | Cantidad |
|---|---|---|
| RF1 | CP-RF1-01, CP-RF1-02, CP-RF1-03, CP-RF1-04 | 4 |
| RF2 | CP-RF2-01, CP-RF2-02, CP-RF2-03 | 3 |
| RF3 | CP-RF3-01, CP-RF3-02 | 2 |
| RF4 | CP-RF4-01, CP-RF4-02, CP-RF4-03 | 3 |
| RF5 | CP-RF5-01, CP-RF5-02, CP-RF5-03, CP-RF5-04 | 4 |
| RF6 | CP-RF6-01, CP-RF6-02 | 2 |
| RF7 | CP-RF7-01, CP-RF7-02, CP-RF7-03 | 3 |
| RF8 | CP-RF8-01, CP-RF8-02 | 2 |
| **Total** | **RF1–RF8** | **23** |

## Qué comprueba cada herramienta

La [colección Billo API](postman/billo-api.postman_collection.json) comprueba la parte de API de CP-RF1-01 a CP-RF1-04 y validaciones adicionales de autenticación. Ver [instrucciones y trazabilidad](postman/README.md). Un resultado de Postman no aprueba por sí solo las pantallas ni la navegación de esos casos: deben ejecutarse también en Android.

RF2–RF8 se ejecutan con los pasos del plan cuando la funcionalidad y sus datos estén disponibles. Los presupuestos y las alertas requieren los saldos iniciales indicados; usar usuarios de QA para evitar que otros gastos alteren los totales. RF7 requiere permisos de notificación y la ejecución controlada del proceso de avisos; RF8 requiere comprobar también la gráfica visible. Los umbrales de RF4 y RF7 siguen sujetos a los supuestos del plan. No se asigna un estado de aprobado a funcionalidades que aún no estén implementadas.

RF9–RF10 y RNF1–RNF4 continúan documentados en el plan; están fuera del alcance RF1–RF8 de esta entrega.

## Revisión de esta tarea documental

La revisión corresponde a **Joshua**, porque QA prepara esta herramienta. Debe verificar cobertura RF1–RF8, importación y ejecución completa sin editar datos, token automático y uso de la plantilla para hallazgos. La aprobación de esta documentación no equivale a aprobar todos los requisitos del producto. No marcar la tarea completa antes de esa revisión.
