# Billo

App móvil de gastos diarios con módulo de membresías digitales.
Proyecto de Tópicos Selectos de Ingeniería de Software — Infinite Labs.

## Estructura
- `mobile/` — App React Native / Expo SDK 58
- `backend/` — API Node.js + Express
- `docs/` — Esquema de BD, contrato de API, plan de pruebas, actas y métricas

## Pruebas automáticas del backend

Con PostgreSQL activo y las credenciales de `backend/.env` configuradas:

```bash
cd backend
npm ci
npm test
```

La suite usa Node Test Runner y Supertest, crea una base temporal desde cero,
aplica las migraciones y la elimina al terminar. El usuario PostgreSQL necesita
permiso `CREATEDB`. Consulta requisitos, cobertura y cómo agregar endpoints en
[backend/README.md](backend/README.md#pruebas-automáticas-hu-28).
El CI ejecuta lint y pruebas en cada pull request.
También prueba el cliente HTTP real de mobile contra la API y PostgreSQL temporal.
El check móvil valida dependencias de SDK 58, Expo Doctor, lint, pruebas unitarias,
temas y bundles de Android/iOS. Consulta la [guía de migración y validación](docs/qa/sdk58-migracion.md).

## Equipo
| Nombre | Rol |
|---|---|
| Joshua José Dávalos Durán | Líder de proyecto |
| Fernando Villafuerte Ferreyra | Frontend y diseño |
| Luis Dorian Ferreira Calderón | QA |
| Iker Solís Ramírez | UX/UI y full-stack |
| Oscar Alejandro Arias Corona | Backend |

## Enlaces
- ClickUp: https://app.clickup.com/90141625121/v/o/s/90148704956
- Figma:  https://www.figma.com/design/jT3VPe8Yb3UwLSuczpDQj9/Billo-%E2%80%94-Dise%C3%B1o?node-id=1-2&t=bDue41opVPmCiTXr-1

## Revisión de cobertura

Estado de implementación de RF2–RF8, evidencia del código y pendientes: [reporte de cobertura del repositorio](docs/qa/prototipo-reporte.md).

Validación de entrega RF7/RF9/RF10 y regresión RF1–RF6/RF8:
[reporte QA del APK HU-53](docs/qa/entrega-rf7-rf9-rf10-reporte.md) y
[lista de requisitos](docs/lista-requisitos.md).

## Instalación del backend
🛠️ Requisitos Previos
Node.js 22.13 o superior dentro de la rama 22 (la misma de `.nvmrc` y CI)
npm
PostgreSQL (ejecutándose en el puerto por defecto 5432)

🚀 Instalación Paso a Paso
1. Clonar el repositorio e ingresar a la carpeta
git clone <URL_DEL_REPOSITORIO>
cd backend


2. Instalar dependencias
npm install


3. Crear la base de datos local
Abre tu consola de PostgreSQL (psql) o tu cliente de preferido (DBeaver, pgAdmin, etc.) y crea la base de datos de desarrollo:
CREATE DATABASE billo_dev;


4. Configurar las variables de entorno
Copia el archivo de ejemplo para crear tu propio archivo .env:
cp .env.example .env

Abre el archivo .env recién creado y actualiza las credenciales de conexión según tu entorno local:
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_contraseña_aqui
DB_NAME=billo_dev


5. Crear la base de datos y esquema desde cero
Con PostgreSQL corriendo y las credenciales configuradas en .env, ejecuta un solo comando para crear todo el esquema:
npm run migrate

💻 Cómo Correr el Backend
Modo Desarrollo (con Nodemon)
Ejecuta el servidor con recarga automática al detectar cambios:
npm run dev

Modo Producción
npm start

🔍 Comprobación de Servicios y Linter
Verificar la salud de la API y PostgreSQL
Con el servidor en ejecución, abre tu navegador o cliente HTTP (Postman/Thunder Client) y realiza una petición a:
GET http://localhost:3000/health

Respuesta esperada:
{
  "status": "OK",
  "uptime": 12.34
}

Además, en la terminal donde corre el servidor, verás la confirmación de la consulta a la base de datos:
✅ Conexión exitosa a PostgreSQL: <TIMESTAMP>

Verificar y corregir el estilo de código (ESLint)
# Correr el linter
npm run lint

## API en línea (HU-52)

La API y su base de datos corren en Render, para que la app funcione desde cualquier teléfono con datos móviles.

- **URL de la API:** `https://billo-api-v30t.onrender.com` (comprobación: `GET /health` responde `{"status":"OK","uptime":...}`).
- **Servicios en Render:** un *Web Service* (`billo-api`, rama `develop`, carpeta raíz `backend`) y una base *PostgreSQL* (`billo-db`), ambos en la región Virginia y en el plan gratuito.
- **Comandos del servicio:** Build `npm ci`; Start `npm run migrate && npm start` (las migraciones se aplican solas en cada despliegue y son idempotentes).
- **Variables de entorno del servicio:** `NODE_ENV=production`, `NODE_VERSION=22`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (los datos **internos** de la base en Render) y `JWT_SECRET` propio, largo y aleatorio. Los valores se configuran en el panel de Render y **nunca** se suben al repositorio.
- **Despliegue:** cada merge a `develop` despliega de nuevo de forma automática.

Límites del plan gratuito:

- La API se apaga tras unos 15 minutos sin uso y la primera petición después puede tardar cerca de un minuto: abre `/health` y espera antes de empezar a probar.
- La base gratuita **expira el 10 de diciembre de 2026** y se borra si no se pasa a un plan de pago.

### Cómo apuntar la app a la API en línea

La URL se define con la variable `EXPO_PUBLIC_API_URL` (sin diagonal final). Para usar la API en línea, en `mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=https://billo-api-v30t.onrender.com
```

Reinicia con `npx expo start -c` para que Expo tome el cambio. Para volver a la API local, usa la IPv4 de tu PC con el puerto 3000 (ver `mobile/.env.example`). Para un APK compilado con EAS, la misma variable debe estar definida en el entorno de EAS antes de compilar.

### Crear la cuenta de administrador en la API en línea

Desde `backend`, con los datos **externos** de la base (hostname largo que termina en `.render.com`) y SSL activado, sin guardar nada en archivos:

```bash
PGSSLMODE=no-verify DB_HOST="<host-externo>" DB_PORT="5432" DB_USER="<usuario>" DB_PASSWORD="<clave-bd>" DB_NAME="<bd>" \
ADMIN_EMAIL="admin@billo.app" ADMIN_PASSWORD="<contraseña-segura>" npm run seed:admin
```

## Instalación de la app móvil

Guía completa (requisitos, cómo correr, mapa de pantallas y lint): [mobile/README.md](mobile/README.md).

### Requisitos

- [Node.js](https://nodejs.org/) 22.13 o superior dentro de la rama 22 (`.nvmrc`)
- [Git](https://git-scm.com/)
- Una de estas opciones para correr la app en Android:
  - La app **Expo Go compatible con SDK 58** instalada en un teléfono Android, o
  - **Android Studio** con un emulador configurado

### Pasos

```bash
git clone https://github.com/JoshuaJose10/BILLO.git
cd BILLO
git checkout develop
cd mobile
npm ci
# Copiar .env.example a .env y ajustar EXPO_PUBLIC_API_URL antes de iniciar.
npm start
```

### Cómo abrir la app en Android

- **Teléfono físico:** con el teléfono y la computadora en la **misma red Wi-Fi**, abre Expo Go y escanea el código QR que aparece en la terminal. Si el QR no funciona, en Expo Go elige ingresar la URL manualmente y escribe la dirección `exp://...` que muestra la terminal.
- **Emulador:** con el emulador de Android Studio abierto, presiona `a` en la terminal donde corre `npm start`.
- **Si la red bloquea la conexión** (por ejemplo, Wi-Fi de la escuela o red pública), inicia el servidor en modo túnel:

  ```bash
  npm start -- --tunnel
  ```

El túnel de SDK 58 requiere iniciar sesión con `npx expo login`.
Voz y widget requieren generar e instalar un **development build nuevo para SDK 58**;
el APK de SDK 57 no sirve para validar los módulos actualizados. Ver [mobile/README.md](mobile/README.md).

### Resultado esperado

Se abre la pantalla de **Login**. Consulta el mapa de pantallas en [mobile/README.md](mobile/README.md).

### Linter

Desde la carpeta `mobile`:

```bash
npm run lint
```

Debe terminar sin errores. Para dar formato automático al código con Prettier:

```bash
npm run format
```
