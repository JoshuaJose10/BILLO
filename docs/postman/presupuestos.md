# Ejecutar QA presupuestos

Colección importable: [presupuestos.postman_collection.json](presupuestos.postman_collection.json).
Reporte: [QA presupuestos](../qa/presupuestos-reporte.md).

## Ejecución automatizada

Requiere Node 22, PostgreSQL y conexión de `backend/.env` con permiso `CREATEDB`. No publicar `.env`. Configurar `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`; opcionalmente `TEST_ADMIN_DATABASE` (por defecto `postgres`). El nombre `DB_NAME` de desarrollo no se usa como destino. Newman 6.2.3 ya está fijado en el lockfile.

Desde la raíz:

```powershell
cd backend
npm ci
npm run qa:presupuestos
```

El comando ejecuta 49 pruebas API con fixtures reiniciadas, comprueba seis respuestas del servicio móvil real aislando React y transporte, y ejecuta la colección completa contra Express y una nueva base PostgreSQL (87 peticiones × dos iteraciones). Ambas bases temporales se eliminan. La segunda ejecución de la colección crea usuarios nuevos y debe repetir todos los resultados.

Escribe `docs/qa/presupuestos-resultados.json` y `docs/qa/presupuestos-automatizadas.tap`. No escribe las sesiones ni el reporte crudo de Newman. El JSON contiene evidencia por petición y aserción, errores, hashes, versiones y comprobación de limpieza.

- Salida `0`: las comprobaciones automáticas pasan. La aprobación humana y la prueba visual se registran aparte.
- Salida `1`: algún caso falla. **Esperada con PRES-QA-01 abierto**, aunque toda la API pase.
- Salida `2`: no fue posible completar la ejecución; no se considera un resultado aprobatorio.

Regresión completa y utilidades móviles:

```powershell
npm test
npm run lint
cd ../mobile
npm test
npm run lint
```

La suite RF3/RF4 también forma parte de `npm test` del backend y del CI existente. Para ejecutarla sola: `npm run test:presupuestos` desde `backend`. La comprobación del bug móvil queda en el comando QA para conservar la regresión API en CI y mostrar por separado el fallo conocido de RF4.

## Repetir sin sobrescribir evidencia

Desde `backend`:

```powershell
$env:QA_OUTPUT_DIR = Join-Path $env:TEMP 'billo-presupuestos-joshua'
npm run qa:presupuestos
$qaExit = $LASTEXITCODE
Remove-Item Env:QA_OUTPUT_DIR
Write-Output "Código QA: $qaExit"
```

Comparar `summary`, `groups`, `stats.assertions`, `integration`, los nombres/estados de `mobile.results`, `executionErrors`, `fileSha256` y `database` con la evidencia del repositorio. La fecha de cada ejecución queda en UTC y debe interpretarse en America/Mexico_City. Registrar la confirmación en el reporte; el ejecutor no firma por Joshua.

Para reproducir solamente la pérdida del aviso:

```powershell
node --experimental-vm-modules qa/verificar-alertas-mobile.cjs
```

Ese comando ejecuta `mobile/src/services/gastos.js` en una VM, con `useMemo`, `useApi` y la conversión numérica aislados. Entrega respuestas API controladas a los métodos POST/PUT y comprueba que el aviso siga disponible al consumidor. No es una prueba de pantalla ni de red. Mientras el bug exista, salen cuatro fallos de conservación del aviso y dos casos sin aviso correctos.

## Postman manual

1. Importar la colección y usar un servidor **QA**, con migraciones y al menos dos categorías de gasto.
2. Seleccionar sin ambiente externo; ajustar la variable de colección `baseUrl` al servidor QA.
3. Ejecutar **todas las carpetas en orden**, dos iteraciones. Se crean A y B con correos dinámicos; los tokens solo viven en variables de la ejecución.
4. Las carpetas finales eliminan gastos y presupuestos creados por estos usuarios. Los usuarios QA quedan en un servidor persistente; el ejecutor automatizado elimina toda su base temporal.
5. No exportar variables con tokens ni reportes crudos. La vía automatizada genera evidencia sanitizada y garantiza la base nueva.

Se usan meses fijos de 2026 y límites 1000/10000 para comparar importes exactos. El porcentaje publicado es entero: 79,99 % puede mostrarse como 80 y 100,01 % como 100, conservando respectivamente `ok` y `excedido`. Los estados esperados son datos explícitos de las pruebas, no una reclasificación del entero redondeado.

La colección se conserva materializada en el repositorio. Para editarla de forma reproducible, modificar `backend/qa/generar-presupuestos.cjs` y regenerarla desde `backend` con:

```powershell
node qa/generar-presupuestos.cjs
```

El generador no conecta a la API. No modifica la colección histórica de Sprint 2 ni sus evidencias.
