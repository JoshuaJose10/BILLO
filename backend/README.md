# Backend de Billo

API REST de Billo (Node.js, Express y PostgreSQL).

## Requisitos

- Node.js 22.13 o superior dentro de la rama 22 (`../.nvmrc`, igual que CI y mobile).
- PostgreSQL (v14 o superior) con una base de datos creada (por ejemplo `billo_dev`)

## Estructura del proyecto

- `src/app.js` — Configuración y definición de la aplicación Express y sus rutas (permite importar la app en pruebas de integración sin levantar un puerto).
- `src/index.js` — Punto de entrada que levanta el servidor HTTP en el puerto configurado y valida la conexión a la base de datos.
- `src/db/` — Conexión a PostgreSQL (`index.js`), script de migraciones (`migrate.js`) y esquema consolidado (`schema.sql`).
- `migrations/` — Archivos SQL de migración versionados (`001_...` a `009_...`).

## Configuración inicial

1. Copia el archivo de variables de entorno y ajusta tus credenciales:

```bash
cp .env.example .env
```

2. Instala las dependencias:

```bash
npm install
```

## Crear la base de datos desde cero con un solo comando

Una vez que tu base de datos esté creada en PostgreSQL (ej. `CREATE DATABASE billo_dev;`) y configurada en `.env`, puedes crear todo el esquema desde cero ejecutando un solo comando:

```bash
npm run migrate
```

### ¿Qué hace `npm run migrate`?
1. Crea la tabla de control `schema_migrations` si no existe.
2. Si detecta una base de datos preexistente (con la tabla `usuarios`), registra automáticamente las migraciones `001` a `007` como aplicadas para evitar duplicación de datos o errores.
3. En una base de datos vacía, ejecuta secuencialmente todas las migraciones (`001` a `009`) en orden alfabético dentro de transacciones individuales.
4. Es completamente **idempotente**: ejecutar `npm run migrate` varias veces seguidas no falla ni duplica registros.

## QA · Sprint 2

`npm run qa:baseline` ejecuta Newman contra una base PostgreSQL nueva y temporal.
Requiere un usuario con permiso `CREATEDB`; lee la conexión de `.env`, aplica las
nueve migraciones y elimina la base al terminar. Guarda evidencias sanitizadas
en `docs/postman/ejecucion-sprint2.json` y `docs/qa/gastos-resultados.json`.
Consulta [la guía de QA](../docs/postman/README.md) y el
[reporte de línea base](../docs/qa/sprint2-linea-base.md).

## Pruebas automáticas (HU-28)

Requieren **Node.js 22.13 o superior dentro de la rama 22**, PostgreSQL 14 o superior activo y un usuario
con permiso `CREATEDB`. No hace falta crear una base de pruebas ni iniciar el
servidor. Se usan las credenciales `DB_HOST`, `DB_PORT`, `DB_USER` y `DB_PASSWORD`
de `.env` o del entorno (el entorno tiene prioridad).

```bash
cd backend
npm ci
npm test
```

`npm test` ejecuta el runner integrado de Node con Supertest contra la app y
PostgreSQL reales. Crea una base aleatoria `billo_test_<fecha>_<aleatorio>` desde
`template0`, comprueba que no tenga tablas y aplica todas las migraciones. Nunca
usa `DB_NAME` como destino de las pruebas. La conexión administrativa usa
`postgres`; se puede cambiar con `TEST_ADMIN_DATABASE`. El JWT de pruebas se
genera en memoria: no requiere modificar `JWT_SECRET` del `.env`.

Cada caso reinicia los datos de usuarios y sus tablas dependientes y prepara dos
cuentas independientes A/B. Las categorías se conservan del seed y se consultan
sin asumir IDs. Al finalizar se cierran las conexiones y se elimina la base,
también cuando falla una aserción. Una terminación forzada del proceso puede
impedir que se ejecute la limpieza. La suite tiene un límite de 55 segundos.

### Cobertura y regresiones

Hay **175 pruebas ejecutables**, sin casos omitidos: 27 de autenticación, 76 de
gastos, 49 de presupuestos/alertas, 17 de resumen mensual y 6 del cliente HTTP de mobile. Se convirtieron los casos de las carpetas 01 y 03 de
`docs/postman/billo-api.postman_collection.json`, con casos adicionales de límites,
tipos y persistencia. La limpieza de Postman queda reemplazada por hooks de la
suite. No se incluyen aquí las carpetas de categorías y errores HTTP globales,
cuyos pendientes se documentan en `docs/qa/sprint2-linea-base.md`.

| Regresión | Pruebas |
|---|---|
| AUTH-QA-01 | Registro con `{ usuario, token }`, JWT utilizable, hash y datos públicos |
| AUTH-QA-02 | Errores con `error.code` y `error.message` |
| AUTH-QA-03 | Ruta oficial `/auth/perfil`, usuarios A/B y alias `/auth/profile` |
| BUG-RF2-01 | POST y PUT rechazan más de dos decimales y subcentavos |
| BUG-RF2-02 | POST y PUT rechazan montos como cadena numérica |
| BUG-RF2-03 | POST y PUT rechazan categoría booleana |
| BUG-RF2-04 | Validación común de la forma JSON de los errores |
| BUG-RF2-05 | GET, POST, PUT y DELETE con token ausente e inválido dan `NO_AUTORIZADO` |
| BUG-RF2-06 | POST y PUT sin cuerpo responden 400, sin cambiar datos |

También se verifican login, correo normalizado y duplicado, token vencido/firma
incorrecta, CRUD persistido, filtros, orden y aislamiento bidireccional A/B.
Las credenciales de las fixtures son ficticias y exclusivas de la base temporal.

`test/suites/mobile.cjs` importa los servicios reales `apiFetch`, `registrar` y
`login` de `mobile/src/services/`. Levanta Express en un puerto local aleatorio y
usa `fetch` contra la misma base temporal. Comprueba registro/login/perfil con JWT,
CRUD persistido y resumen, aislamiento A/B, errores 400 y cierre de sesión ante
un 401 autenticado. No requiere instalar las dependencias de Expo en este job.
Esta integración comprueba el contrato HTTP usado por SDK 58; las APIs nativas
de React Native se prueban en dispositivo según la [guía SDK 58](../docs/qa/sdk58-migracion.md).

### QA de presupuestos y alertas (RF3/RF4)

`test/suites/presupuestos.cjs` cubre CP-RF3-01/02 y CP-RF4-01 a 07,
CRUD, validaciones, ausencia de presupuesto, recálculo y aislamiento por usuario,
mes y categoría. Se ejecuta dentro de `npm test` y también por separado:

```powershell
npm run test:presupuestos
npm run qa:presupuestos
```

El segundo comando ejecuta los mismos 49 casos en Node y la colección dedicada
de Postman con Newman 6.2.3 (202 peticiones × 2 iteraciones). Cada runner crea y
elimina su propia base temporal con las diez migraciones. Genera evidencia sin
sesiones en `docs/qa/presupuestos-resultados.json` y
`docs/postman/ejecucion-presupuestos.json`. Exige el 100 % de casos y aserciones;
devuelve 0 si pasan todos, 1 si hay fallos y 2 si no se pudo completar la ejecución.
`QA_OUTPUT_DIR` permite guardar la repetición fuera de la evidencia del repositorio.
Consulta el [reporte QA presupuestos](../docs/qa/presupuestos-reporte.md),
incluidas las instrucciones y la confirmación pendiente de Joshua.

### Agregar nuevas suites

1. Copia `test/templates/endpoint.cjs.example` a un módulo nuevo en `test/suites/`
   (sin sobrescribir las suites existentes). La plantilla trae un ejemplo para
   `GET /presupuestos`.
2. Registra el módulo en `test/integration.test.cjs` con
   `require('./suites/presupuestos.cjs')(() => context);` (ajusta el nombre).
3. Agrega como mínimo un `it` por endpoint nuevo, verificando HTTP, cuerpo y,
   cuando haya escritura, persistencia. Añade validaciones y privacidad A/B
   según el contrato. Usa `ctx.api`, `ctx.a`, `ctx.b`, `ctx.pool` y
   `expectError` de las helpers; el `beforeEach` debe llamar `ctx.reset()`.
4. Ejecuta `npm test` y `npm run lint`. Los casos se ejecutan en serie porque
   comparten la base y el reinicio de fixtures.

### CI y revisión de Oscar

`.github/workflows/ci.yml` ejecuta `npm ci`, lint y `npm test` en cada PR con
PostgreSQL 16 y Node 22 desde `.nvmrc`. Se conserva el nombre del check `Backend (lint)` para
respetar las reglas de rama existentes. Un fallo de la suite hace fallar el job.

Para comprobar que las pruebas detectan una validación rota:

1. En `src/controllers/gastos.controller.js`, cambia temporalmente
   `nota.length > 200` por `nota.length > 201`.
2. Ejecuta `npm test`: deben fallar los dos casos de nota de más de 200 caracteres
   (POST y PUT) y el comando debe devolver código 1.
3. Restaura `nota.length > 200` y ejecuta `npm test`: deben pasar las 103 pruebas.

La confirmación de Oscar en el PR sigue siendo necesaria para completar QA.

## Comandos del servidor

- **Modo desarrollo (con recarga automática):**
  ```bash
  npm run dev
  ```

- **Modo producción:**
  ```bash
  npm start
  ```

- **Verificación de estilo y linter:**
  ```bash
  npm run lint
  ```

## Endpoints experimentales

- `GET /tipo-cambio?de=USD&a=MXN` — **experimental (HU-23, spike RF11)**. Devuelve el tipo de cambio desde [Frankfurter](https://frankfurter.dev) (gratis, sin clave) y lo guarda en memoria una hora. No requiere token y no forma parte del contrato de la API; puede cambiar o eliminarse en el Sprint 3. Ver [docs/spike-rf11-rf13.md](../docs/spike-rf11-rf13.md).
  ```bash
  curl "http://localhost:3000/tipo-cambio?de=USD&a=MXN"
  # {"de":"USD","a":"MXN","tasa":18.6311,"fecha":"2026-10-28","fuente":"frankfurter.dev (BCE)","cache":false}
  ```
