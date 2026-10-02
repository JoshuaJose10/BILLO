# Billo

App móvil de gastos diarios con módulo de membresías digitales.
Proyecto de Tópicos Selectos de Ingeniería de Software — Infinite Labs.

## Estructura
- `mobile/` — App React Native / Expo
- `backend/` — API Node.js + Express
- `docs/` — Esquema de BD, contrato de API, plan de pruebas, actas y métricas

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

## Instalación del backend
🛠️ Requisitos Previos
Node.js (v18 o superior)
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

## Instalación de la app móvil

### Requisitos

- [Node.js](https://nodejs.org/) 20 LTS o superior
- [Git](https://git-scm.com/)
- Una de estas opciones para correr la app en Android:
  - La app **Expo Go** instalada en un teléfono Android, o
  - **Android Studio** con un emulador configurado

### Pasos

```bash
git clone https://github.com/JoshuaJose10/BILLO.git
cd BILLO
git checkout develop
cd mobile
npm install
npx expo start
```

### Cómo abrir la app en Android

- **Teléfono físico:** con el teléfono y la computadora en la **misma red Wi-Fi**, abre Expo Go y escanea el código QR que aparece en la terminal. Si el QR no funciona, en Expo Go elige ingresar la URL manualmente y escribe la dirección `exp://...` que muestra la terminal.
- **Emulador:** con el emulador de Android Studio abierto, presiona `a` en la terminal donde corre `npx expo start`.
- **Si la red bloquea la conexión** (por ejemplo, Wi-Fi de la escuela o red pública), inicia el servidor en modo túnel:

  ```bash
  npx expo start --tunnel
  ```

### Resultado esperado

Se muestra una pantalla blanca con el texto **"Billo"** centrado.

### Linter

Desde la carpeta `mobile`:

```bash
npm run lint
```

Debe terminar sin errores. Para dar formato automático al código con Prettier:

```bash
npm run format
```
