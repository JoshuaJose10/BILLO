# Billo API — HU-15

Colección importable: [billo-api.postman_collection.json](billo-api.postman_collection.json), Postman Collection v2.1. **74 peticiones por iteración**, cuatro carpetas en orden.

## Alcance acordado

Se usa `GET /auth/profile` por instrucción del solicitante. La diferencia con `/auth/perfil` queda excluida. No se crean reportes de bugs nuevos ni se modifican asignaciones o estados externos. Las demás fallas se conservan en las aserciones y el resumen; no se consideran aprobadas.

Los reportes anteriores son antecedentes de otros commits y no se suman a esta ejecución.

## Preparación y Collection Runner

1. Usar backend de `develop`, con HU-08 y HU-12 integradas; registrar el commit probado.
2. Configurar `backend/.env` desde `.env.example` con PostgreSQL de QA, JWT_SECRET y expiración. No publicar credenciales.
3. Desde `backend`: `npm install`, `npm run migrate`, `npm run dev`.
4. Confirmar `/health` → 200 y conexión a PostgreSQL.
5. Importar la colección en Postman. Seleccionar **sin ambiente**, las 74 peticiones y **dos iteraciones**. Modificar solamente `baseUrl` si cambia el servidor.

Cada iteración registra A/B con correos distintos de example.test, obtiene sus IDs/tokens y lee la categoría válida del catálogo. No hay que copiar datos manualmente. La primera petición reinicializa la sesión. No usar variables globales o de ambiente que oculten las variables de colección. Los valores de sesión exportados están vacíos; `tokenInvalido=invalido` es un dato negativo público.

## Cobertura

| Carpeta | Casos por iteración | Alcance |
|---|---:|---|
| Autenticación RF1 | 14 | Registro válido/duplicado/inválido, login válido/incorrecto/inexistente, perfil A/B, sin token y token inválido |
| Categorías | 4 | Catálogo, filtro gasto, tipo inválido y sin token |
| HU-12 Gastos RF2 | 54 | CRUD, persistencia, filtros, privacidad A/B, validaciones y cuatro rutas sin token/con token inválido |
| Limpieza | 2 | Eliminar gastos residuales de las cuentas creadas por la iteración |

Los CP-RF1 originales conservan sus IDs. Los QA-GAS trazan HU-12; crear un gasto y rechazar monto/categoría inválidos cubren la parte API de CP-RF2-01/02/03. No aprueban pantallas móviles. No se verifica la expiración de un JWT firmado: token inválido y ausencia de token son escenarios distintos.

Privacidad: listas separadas, PUT/DELETE ajenos en ambos sentidos → 404 y consulta posterior que confirma datos intactos. Luego se verifica actualización y eliminación persistidas.

Las aserciones funcionales aceptan code/message para continuar; las de CONTRATO exigen codigo/mensaje. Un caso puede tener HTTP correcto y fallar por contrato.

## Newman y evidencia

Desde la raíz en PowerShell, con el backend activo:

```powershell
$qaRawReport = Join-Path $env:TEMP 'billo-hu15-newman.json'
npx --yes newman@6.2.3 run docs/postman/billo-api.postman_collection.json --iteration-count 2 --reporters cli,json --reporter-json-export $qaRawReport
$qaRunnerExit = $LASTEXITCODE
node docs/postman/resumir-ejecucion.cjs $qaRawReport docs/postman/ejecucion-hu15-2026-10-22.json
Remove-Item -LiteralPath $qaRawReport
```

Newman devuelve 1 si hay aserciones fallidas; distinguirlas de errores del ejecutor. El conversor guarda HTTP, respuesta sanitizada y aserciones por caso. Omite solicitudes, cabeceras y variables de sesión. El reporte crudo contiene JWT y credenciales de prueba: no versionarlo.

Un caso es una petición de colección por iteración; pasa cuando todas sus aserciones pasan y no hay error de transporte. Las aserciones se cuentan aparte. Fallas repetidas no equivalen a bugs distintos.

La limpieza usa pm.sendRequest para borrar gastos residuales de negativos aceptados indebidamente y verificar listas vacías. Sus aserciones pertenecen a los dos casos de limpieza; el total de solicitudes HTTP puede superar el de casos. Las cuentas permanecen porque no existe API para borrarlas. No ejecutar en producción.

Ver [resumen HU-15](../qa/hu15-reporte.md) y [evidencia sanitizada](ejecucion-hu15-2026-10-22.json).

## Revisión y regresión

Joshua debe ejecutar sin modificar datos manualmente y contrastar el resumen con groups, stats y las aserciones del JSON. Comprobar aislamiento y limpieza en ambas iteraciones.

Tras una corrección, ejecutar toda la colección sobre el nuevo commit y guardar evidencia con otro nombre. No sobrescribir esta ejecución histórica. Repetir el mismo commit verifica repetibilidad; no acredita regresión posterior a una corrección.
