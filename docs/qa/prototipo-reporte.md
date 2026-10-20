# Revisión de calidad del prototipo — RF2–RF8

Fecha de documentación: 2026-10-20 (America/Mexico_City).
Prioridad de la tarea: Normal.
Referencia: HU-05 (prototipo). Los hallazgos, si existen, alimentan las correcciones de Iker antes de HU-14.
Destinatario: Iker Solís Ramírez (UX/UI).

## Base y alcance de la revisión

Este reporte formaliza la revisión previa comunicada por el solicitante: todos los requisitos se cumplen y no se encontraron bugs. La cobertura y el resultado de usabilidad se registran con base en esa revisión; no representan un nuevo recorrido independiente de Figma realizado al preparar este documento.

- Requisitos y escenarios: [plan de pruebas](../plan-de-pruebas.md), RF2–RF8.
- Prototipo: [Billo — Diseño en Figma](https://www.figma.com/design/jT3VPe8Yb3UwLSuczpDQj9/Billo-%E2%80%94-Dise%C3%B1o?node-id=1-2), enlace registrado en el [README](../../README.md).
- Reporte de defectos: [plantilla de bugs](../plantilla-reporte-bug.md) y [criterios de calidad](../criterios-calidad.md).

Las pantallas de la tabla se identifican por su función según el plan de pruebas. No se dispone de enlaces individuales a frames, capturas, versión del prototipo ni fecha de la revisión original; no se atribuyen nombres exactos de frames. El estado de HU-05 en ClickUp tampoco se verificó al documentar esta entrega.

## Tabla de cobertura

La columna «Cubierto» refleja la validación previa del solicitante. Los casos del plan se enlazan como trazabilidad del alcance, sin afirmar que se ejecutaron pruebas de la aplicación implementada.

| Requisito | Pantalla o estado del prototipo (referencia funcional) | Cobertura contemplada en el plan | Casos relacionados | Cubierto |
|---|---|---|---|---|
| RF2. Registrar gasto diario | Nuevo gasto y lista de gastos | Captura de monto, categoría, fecha y método de pago; visualización del gasto guardado; mensajes por monto inválido y categoría obligatoria. | CP-RF2-01 a CP-RF2-03 | Sí |
| RF3. Presupuesto mensual por categoría | Presupuestos y formulario de presupuesto | Selección de categoría y mes, captura del límite y confirmación; rechazo de monto negativo. | CP-RF3-01 a CP-RF3-02 | Sí |
| RF4. Alerta de presupuesto | Presupuestos / estado de alerta al registrar un gasto | Avisos al acercarse al límite y al superarlo; ausencia de alerta cuando no corresponde. | CP-RF4-01 a CP-RF4-03 | Sí |
| RF5. Gestión de membresías | Lista, alta y detalle/edición de membresía; confirmación de eliminación | Nombre, costo, frecuencia y fecha de cobro; alta, edición y eliminación; mensajes por nombre vacío y costo inválido. | CP-RF5-01 a CP-RF5-04 | Sí |
| RF6. Gasto total mensual | Resumen mensual | Desglose de gasto variable, gasto fijo por membresías y total; estado sin movimientos con importes en cero. | CP-RF6-01 a CP-RF6-02 | Sí |
| RF7. Notificación de cobro | Aviso de próximo cobro de membresía | Representación del aviso con nombre y fecha de cobro. El envío anticipado y la exclusión de membresías eliminadas requieren pruebas posteriores de implementación. | CP-RF7-01 a CP-RF7-03 | Sí |
| RF8. Gráficas por categoría | Reportes / gráfica por categoría y estado sin datos | Distribución de gastos por categoría y mensaje cuando no existen datos. | CP-RF8-01 a CP-RF8-02 | Sí |

Resultado informado: **7 de 7 requisitos cubiertos; 0 parciales y 0 faltantes**.

Los valores del 80 % para RF4 y de 3 días para RF7 siguen siendo supuestos por confirmar con Joshua en el plan de pruebas. Esta revisión de diseño no confirma esas decisiones ni valida cálculos, persistencia, respuestas HTTP o entrega real de notificaciones.

## Usabilidad

Resultado global comunicado por el solicitante: **sin problemas de usabilidad detectados**. Los aspectos que contempla la tarea son claridad de textos, tamaño de botones, estados de error, listas vacías, navegación de regreso y contraste. No se aportó un registro individual por aspecto ni mediciones de accesibilidad; este reporte conserva el resultado global de la revisión previa.

## Lista de hallazgos

**Sin hallazgos reportados en la revisión del prototipo.**

| Severidad | Cantidad |
|---|---|
| Crítica | 0 |
| Alta | 0 |
| Media | 0 |
| Baja | 0 |
| **Total** | **0** |

No corresponde generar reportes de bugs ni capturas de fallos al no existir defectos detectados. Si se identifica alguno posteriormente, se utilizará la [plantilla de reporte de bugs](../plantilla-reporte-bug.md), indicando pantalla/frame, precondiciones, pasos, resultado esperado, resultado obtenido, captura y severidad. Los puntos graves se volverán a revisar después de su corrección; actualmente no hay puntos que requieran reprueba.

Este resultado corresponde únicamente al prototipo. Los defectos de API documentados en otros reportes de QA conservan su seguimiento propio.

