# Billo API · Sprint 2 · línea base

Colección Postman v2.1: [billo-api.postman_collection.json](billo-api.postman_collection.json).
Contrato v1.1 (HU-16), sobre `develop` con HU-17, HU-18 y HU-19 integradas.

## Ejecución reproducible con Newman

Requiere Node.js 22, PostgreSQL y un usuario con permiso `CREATEDB`. Configurar
`DB_HOST`, `DB_PORT`, `DB_USER` y `DB_PASSWORD` en `backend/.env` desde el ejemplo.
`QA_ADMIN_DATABASE` es opcional (por defecto `postgres`). No publicar ese archivo.

Desde la raíz:

```powershell
cd backend
npm ci
npm run qa:baseline
```

El comando usa Newman **6.2.3**, fijado en `package-lock.json`. Crea una base
`billo_qa_<instante>_<aleatorio>` desde `template0`, verifica que esté vacía y aplica
las nueve migraciones. Genera un JWT_SECRET temporal, importa `src/app.js` sin
modificaciones y escucha en un puerto disponible de `127.0.0.1`. No necesita un
servidor previo y no utiliza `DB_NAME` como destino de pruebas.

Ejecuta **79 peticiones × 2 iteraciones = 158 casos**, comprueba que la limpieza
deje cero gastos y elimina exclusivamente la base creada por esa ejecución.
Los errores de ejecución también pasan por la limpieza. Una terminación forzada
del proceso puede impedirla.

Guarda solo evidencia sanitizada:

- [ejecucion-sprint2.json](ejecucion-sprint2.json): colección completa, resultados
  por caso y aserción, totales de Newman, commit, hashes y migraciones.
- [gastos-resultados.json](../qa/gastos-resultados.json): los 108 casos de gastos
  extraídos de **la misma ejecución**; no se suman de nuevo al total.

Código de salida: `0` si no hay fallos; `1` si hay casos o aserciones fallidos,
aunque se alcance el 95 %; `2` si el ejecutor no pudo completar la verificación.
`acceptance` indica por separado si casos y aserciones alcanzan el 95 %.
Los reportes crudos de Newman no se escriben en disco porque contienen sesiones.

## Repetición de Joshua

Usar el mismo código, lockfile y colección. Para conservar la evidencia publicada,
dirigir la repetición a otro directorio absoluto:

```powershell
$env:QA_OUTPUT_DIR = Join-Path $env:TEMP 'billo-sprint2-joshua'
npm run qa:baseline
$qaExit = $LASTEXITCODE
Remove-Item Env:QA_OUTPUT_DIR
```

Comparar `summary`, `groups`, `stats.assertions`, nombres de fallos,
`executionErrors`, hashes de los archivos y `database` con la evidencia publicada.
Los instantes, nombre aleatorio de BD, IDs, correos y JWT pueden variar. La BD
debe iniciar sin tablas, aplicar todas las migraciones, terminar con cero gastos
y quedar eliminada. Joshua registra su resultado y confirma los números en el
[reporte de línea base](../qa/sprint2-linea-base.md); esta entrega no sustituye su revisión.

## Cobertura y conteo

| Carpeta | Casos por iteración |
|---|---:|
| Autenticación | 17 |
| Categorías | 4 |
| Gastos: CRUD, privacidad A/B, filtros, validaciones y tokens | 54 |
| Limpieza por API | 2 |
| HU-18: JSON malformado y ruta inexistente | 2 |

Se conservan los 74 casos originales de HU-15 y se agregan cinco: alias del
perfil, registro sin cuerpo, login sin cuerpo, JSON malformado y ruta inexistente.
Se usa `/auth/perfil` como ruta oficial, con un caso separado para `/auth/profile`.
Se exigen `error.code` y `error.message`, y `NO_AUTORIZADO` en los 401 de rutas
protegidas. El 401 del login sigue siendo `CREDENCIALES_INVALIDAS`.
Ambos registros deben devolver `{ usuario, token }`. El registro B envía el correo
en mayúsculas y comprueba normalización y login posterior en minúsculas.

Un caso pasa cuando todas sus aserciones pasan y no existe error de transporte.
Las solicitudes auxiliares de `pm.sendRequest` pertenecen a los casos de limpieza.
El conversor exige que el número de casos y aserciones coincida con Newman y que
se haya ejecutado la colección completa. No hay casos excluidos ni saltados.

Para usar Postman manualmente: importar la colección, seleccionar sin ambiente,
ajustar `baseUrl` al servidor QA y ejecutar todas las carpetas en orden, dos
iteraciones. El ejecutor anterior es la vía que garantiza una base nueva.
No se prueba expiración de JWT firmado, la UI móvil ni el arranque de `src/index.js`.

## Antecedentes

Los reportes de [HU-15](../qa/hu15-reporte.md),
[2026-10-22](ejecucion-hu15-2026-10-22.json) y
[2026-10-19](ejecucion-auth-2026-10-19.json) son históricos y se conservan intactos.
Los alcances antiguos que excluían `/auth/perfil` o nuevos bugs no aplican a esta
línea base. No se reconstruye una ejecución histórica sin sus artefactos originales.
