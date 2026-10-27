# Backend de Billo

API REST de Billo (Node.js, Express y PostgreSQL).

## Requisitos

- Node.js (v18 o superior)
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

## Ejecución del servidor

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
