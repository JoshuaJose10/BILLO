# Criterios de calidad y reporte de bugs: Billo

## 1. Niveles de severidad

| Nivel | Definición | Ejemplo en Billo |
|---|---|---|
| Crítico | La app se cierra, se pierden datos o hay un problema de seguridad. No hay forma de continuar. | La app se cierra al abrir la pantalla de gastos, o los gastos guardados desaparecen al cerrar sesión. |
| Alto | Una función principal no sirve, sin solución alternativa. | No se puede registrar un gasto (RF2) porque el servidor responde error 500. |
| Medio | Falla con un caso poco común; el uso normal no se afecta. | Al registrar un gasto con más de 2 decimales, el total mensual se muestra mal. |
| Bajo | Detalle visual o de redacción que no afecta la función. | El botón dice "Guadar" en lugar de "Guardar". |

La severidad mide el impacto en el usuario. La prioridad (qué se corrige primero) la decide el equipo con base en la severidad.

## 2. Reglas de aprobación

QA **aprueba** una tarea solo si se cumplen todas estas condiciones:

| # | Condición |
|---|---|
| 1 | No tiene bugs Críticos ni Altos abiertos. |
| 2 | Cumple todos los criterios de aceptación de la tarea. |
| 3 | Cumple los umbrales de calidad de la sección 3 que le apliquen. |
| 4 | Los bugs Medios abiertos están registrados en ClickUp, con responsable y fecha. |
| 5 | Los bugs Bajos no bloquean la aprobación, pero quedan registrados. |
| 6 | Cumple la Definition of Done. |

QA **rechaza** la tarea si ocurre cualquiera de estos casos:

| # | Motivo de rechazo |
|---|---|
| 1 | Hay al menos un bug Crítico o Alto abierto. |
| 2 | Falla algún criterio de aceptación de la tarea. |
| 3 | No cumple algún umbral de calidad aplicable (RNF1, RNF2 o RNF3). |
| 4 | No se puede probar porque falta información o evidencia. |

Al rechazar, QA registra cada bug con la plantilla de la sección 4 y devuelve la tarea a "En desarrollo". Cuando el bug se corrige, QA repite la prueba con los mismos pasos.

## 3. Umbrales de calidad del proyecto

| ID | Requisito | Umbral | Cómo se verifica |
|---|---|---|---|
| RNF1 | Compatibilidad | La app funciona en Android. | Prueba en dispositivo o emulador Android. |
| RNF2 | Rendimiento | Las respuestas tardan menos de 2 s. | Tiempo de respuesta medido en Postman o en la app. |
| RNF3 | Seguridad | Las contraseñas se guardan cifradas. | Revisión de la base de datos: no debe existir ninguna contraseña en texto plano. |

Incumplir un umbral se reporta como bug con severidad Alta como mínimo. Si es RNF3, la severidad es Crítica.

## 4. Plantilla de reporte de bug

| Campo | Qué escribir |
|---|---|
| Título | `[RFx] Qué falla` (ejemplo: `[RF2] Crear gasto acepta monto con texto`). |
| Severidad | Crítica, Alta, Media o Baja, según la sección 1. |
| Pasos para reproducir | Lista numerada con todos los pasos, incluyendo datos exactos. |
| Resultado esperado | Lo que debería pasar. |
| Resultado obtenido | Lo que pasó realmente. |
| Evidencia | Captura, video o log. |
| Ambiente | Rama, sistema operativo y versión (ejemplo: Node 20). |

**Ejemplo:**

```
Título: [RF2] Crear gasto acepta monto con texto
Severidad: Alta
Pasos para reproducir: 1) Iniciar sesión  2) POST /gastos con monto "ochenta"
Resultado esperado: Error 400 y el gasto no se guarda
Resultado obtenido: Responde 201 y guarda monto 0
Evidencia: captura de Postman
Ambiente: rama feature/rf2-crud-gastos, Windows 11, Node 20
```

**Reglas para reportar:**

| Regla | Detalle |
|---|---|
| Un bug por reporte | No mezclar varios problemas. |
| Reproducible sin preguntas | Otro desarrollador debe poder repetirlo usando solo el reporte. |
| Datos exactos | Escribir los valores usados, no "un monto inválido". |

## 5. Métricas de calidad

Estas métricas se calculan con los reportes en ClickUp:

| Métrica | Cómo se calcula |
|---|---|
| Bugs por severidad | Conteo de bugs abiertos y cerrados por nivel. |
| Tasa de rechazo | Tareas rechazadas por QA ÷ tareas revisadas. |
| Tiempo de corrección | Días entre la creación y el cierre del bug. |
| Cumplimiento de RNF | RNF cumplidos ÷ RNF totales (RNF1, RNF2, RNF3). |

## Como hacer plantilla en ClickUp

1. Crea una tarea con el nombre `[RFx] Título del bug`.
2. Agrega un campo desplegable **Severidad** con los valores Crítica, Alta, Media y Baja.
3. Pon en la descripción los campos: Pasos para reproducir, Resultado esperado, Resultado obtenido, Evidencia y Ambiente.
4. Guárdala con **Guardar como plantilla → Plantilla de tarea**, con el nombre "Reporte de bug".
