# Plantilla de reporte de bug — Billo

Copiar esta plantilla para cada defecto en ClickUp o en un archivo de seguimiento y enlazar el reporte desde el checklist. Un defecto por reporte; si afecta varios casos, listar los IDs sin duplicarlo. Seguir las definiciones de [criterios de calidad](criterios-calidad.md), sección 4.

```markdown
# [RFx] Descripción concreta del fallo

- Caso(s): CP-RFx-nn
- Historia / tarea: [nombre y enlace, si existe]
- Severidad: Crítica / Alta / Media / Baja
- Estado: Abierto
- Responsable: Por asignar
- Fecha de reporte: YYYY-MM-DD
- Fecha de corrección: Por acordar

## Ambiente

- Rama y commit:
- API / ambiente de pruebas:
- Sistema operativo, versión de Node o modelo y versión del celular:
- Versión de la app / Postman / Newman:

## Precondiciones

Datos, usuario QA y dependencias necesarias para reproducir.

## Pasos para reproducir

1. Iniciar la aplicación o preparar la petición.
2. Introducir datos exactos de prueba, indicando método, ruta y cuerpo cuando aplique.
3. Ejecutar la acción e identificar dónde aparece el fallo.

## Resultado esperado

Comportamiento o HTTP y cuerpo esperados; enlazar el caso y el contrato aplicable.

## Resultado obtenido

Comportamiento observado, HTTP y respuesta sanitizada cuando aplique.

## Evidencia

Enlace a captura, video o resultado de ejecución. Omitir tokens, contraseñas y credenciales reales.

## Reprueba

- Commit corregido:
- Fecha y quién probó:
- Resultado: Pendiente / Pasa / Falla
- Evidencia:
```

La severidad mide el impacto; la prioridad la acuerda el equipo. No asignar una persona o fecha de corrección sin acuerdo. Un caso bloqueado por una dependencia pendiente se documenta como bloqueo; no inventar un bug de una función que aún no se puede evaluar.
