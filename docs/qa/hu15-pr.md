## Qué hace este PR

Amplía la colección de HU-08 para HU-15 con categorías, CRUD de gastos y aislamiento entre dos usuarios. Los tokens e IDs se obtienen automáticamente y la limpieza elimina los gastos de prueba al finalizar cada iteración.

Por alcance acordado se usa `/auth/profile` y no se crean reportes de bugs nuevos. Se conservan las aserciones fallidas y los reportes históricos. Incluye evidencia sanitizada y resumen por historia/área para la Review.

**Tarea de ClickUp:** HU-15 — enlace pendiente de vincular por el equipo.
**Rama base:** develop

## Cómo probarlo (para QA)

1. Configurar el backend y PostgreSQL de QA; ejecutar `npm install`, `npm run migrate` y `npm run dev` desde `backend`.
2. Importar `docs/postman/billo-api.postman_collection.json` en Postman, sin ambiente, y correr las 74 peticiones completas con dos iteraciones.
3. Contrastar las aserciones con `docs/qa/hu15-reporte.md` y el JSON de evidencia. También se puede usar Newman según `docs/postman/README.md`.

Validación sobre backend `8b9975f`: 148 casos, 38 aprobados y 110 fallidos; 726 aserciones, 576 aprobadas y 150 fallidas; sin errores de transporte/scripts. El aislamiento A/B pasó. La API requiere correcciones antes de un visto bueno general. `npm run lint` pasó.

## Checklist

- [ ] Cumple todos los criterios de aceptación originales: exclusiones de perfil y reportes acordadas, fallas API pendientes
- [x] `npm run lint` sin errores
- [x] No hay contraseñas ni claves reales en los archivos entregados
- [x] Documentación y evidencia actualizadas
