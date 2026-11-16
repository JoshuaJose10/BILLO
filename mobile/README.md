# Billo — App móvil

App React Native / **Expo SDK 58** de Billo (React Native 0.88.1 y React 19.3.0).

## Requisitos

- [Node.js](https://nodejs.org/) **22.13 o superior dentro de la rama 22**, alineado con `../.nvmrc` y GitHub Actions. `package.json` declara las otras ramas compatibles con Expo.
- [Git](https://git-scm.com/)
- **Expo Go compatible con SDK 58** en tu teléfono (o un emulador de Android Studio). Revisa la versión en [expo.dev/go](https://expo.dev/go).
- API y PostgreSQL activos para probar registro, login y persistencia.

## Instalar y correr

Desde la carpeta `mobile`:

```bash
npm ci
# Copia .env.example a .env y configura EXPO_PUBLIC_API_URL.
npm start
```

Escanea el código QR con Expo Go (teléfono y computadora en la misma red Wi-Fi). En un emulador de Android, presiona `a` en la terminal.
`npm start` usa `expo start --go` explícitamente. En un teléfono físico,
`EXPO_PUBLIC_API_URL` debe apuntar a la IP LAN de la computadora que sirve la API,
por ejemplo `http://192.168.1.10:3000`; `localhost` apunta al propio teléfono.
En el emulador Android estándar se puede usar `http://10.0.2.2:3000`.

Si la red bloquea la conexión (Wi-Fi de la escuela o red pública), usa el modo túnel:

```bash
npx expo login
npm start -- --tunnel
```

> En Windows, si PowerShell bloquea `npx` por la política de scripts, usa `npx.cmd`.

El túnel de Metro no publica la API: el teléfono también debe poder llegar a
`EXPO_PUBLIC_API_URL`. Después de cambiar `.env`, reinicia con `npm start -- --clear`.

## Development build: voz y widget

`expo-speech-recognition` y `react-native-android-widget` no están incluidos en
Expo Go. En Perfil → Laboratorio (spike), deben mostrarse como no disponibles
sin pantalla roja. Para ejecutarlos necesitas un binario nuevo de SDK 58:

```bash
npx eas-cli build --profile development --platform android
npm run start:dev-client
```

El proyecto EAS ya está configurado; no repitas `eas init`. Instala el APK nuevo
antes de conectarlo a Metro. En iOS se necesita un development build propio
con la configuración y credenciales de Apple correspondientes.
El registro de gastos por voz en Nuevo gasto (HU-57) usa este mismo binario; en Expo
Go el micrófono no aparece. Casos de prueba en [hu57-voz.md](../docs/qa/hu57-voz.md).
Los resultados del [spike de SDK 57](../docs/spike-rf11-rf13.md) son históricos;
repite voz, widget y reinicio en SDK 58 siguiendo la
[guía de migración](../docs/qa/sdk58-migracion.md).

### Notificaciones push (HU-47, RF7)

`expo-notifications` necesita Firebase Cloud Messaging en Android. `app.config.js`
usa el archivo indicado por `GOOGLE_SERVICES_JSON` en EAS, o
`mobile/google-services.json` si existe localmente. Además hace falta la credencial
FCM V1 en EAS; consultar la sección Firebase al final de este documento.
Sin esa configuración no se puede validar la recepción push de RF7.

## APK de entrega (HU-53)

Para generar y compartir una nueva versión, seguir la
[guía de release Android](../docs/release-android.md). La configuración local
prepara la versión **1.0.1**; no significa que ya exista un APK publicado.

El perfil `release` de `eas.json` genera un APK instalable que ya apunta a la API en línea
(`EXPO_PUBLIC_API_URL=https://billo-api-v30t.onrender.com`, ver «API en línea» en el README de la raíz). No usa
el `.env` local: la URL va en el propio perfil.

```bash
cd mobile
npx eas-cli build --profile release --platform android
```

Al terminar, EAS muestra un enlace de la compilación con el botón de descarga del APK. Para instalarlo en el
teléfono Android, abre ese enlace desde el teléfono (o descarga el archivo y ábrelo) y permite instalar apps de
orígenes desconocidos cuando el sistema lo pida.

- **Enlace de descarga del APK vigente (v1.0.0-apk):** [application-56bcd3ef-2c7e-42a5-b9c6-09cb1fc4950e.apk](https://github.com/JoshuaJose10/BILLO/releases/download/v1.0.0-apk/application-56bcd3ef-2c7e-42a5-b9c6-09cb1fc4950e.apk) · página del release: <https://github.com/JoshuaJose10/BILLO/releases/tag/v1.0.0-apk>
- **Antes de probar:** abre `https://billo-api-v30t.onrender.com/health` y espera la respuesta; la API gratuita
  se duerme tras unos 15 minutos sin uso y tarda cerca de un minuto en despertar.
- **Notificaciones push:** sin `google-services.json` (ver sección anterior) la app funciona igual, solo que no
  obtiene token push.

## Mapa de pantallas

```
RootNavigator (stack)
├── Auth (AuthStack, sin header)          ← ruta inicial
│   ├── Login      → "Entrar" (reset a Main) / "Crear cuenta" (a Registro)
│   └── Registro
├── Main (MainTabs, sin header, navbar flotante)
│   ├── Inicio
│   ├── Movimientos
│   ├── [botón central +]  → abre NuevoGasto (acción, no es pestaña)
│   ├── Reportes
│   └── Cartera
└── NuevoGasto (hoja inferior transparentModal, encima de la navbar)
```

| Archivo                           | Qué contiene                                                        |
| --------------------------------- | ------------------------------------------------------------------- |
| `App.js`                          | `NavigationContainer` + `RootNavigator`                             |
| `src/navigation/RootNavigator.js` | Stack raíz: Auth, Main y NuevoGasto                                 |
| `src/navigation/AuthStack.js`     | Stack de autenticación: Login y Registro                            |
| `src/navigation/MainTabs.js`      | Tabs: Inicio, Movimientos, Reportes y Cartera, con `NavbarFlotante` |
| `src/screens/*Screen.js`          | Una pantalla por archivo                                            |

El login usa la API; configura la URL antes de probarlo.

## Lint y formato

```bash
npm run lint     # ESLint, debe terminar sin errores
npm run format   # Prettier, da formato a todo el código
```

## Validación automática y CI

Desde `mobile`, después de `npm ci`:

```bash
npm run check:sdk       # Dependencias recomendadas por Expo SDK 58; no modifica archivos
npm run doctor          # Configuración, plugins y dependencias de Expo
npm run lint
npm test                # Pruebas de lógica; no requieren API ni emulador
npm run verificar:temas
npm run test:bundle     # Genera bundles de Android e iOS en dist/
```

Desde `backend`, `npm ci` y `npm test` ejecutan además la integración del cliente
HTTP de mobile con Express y PostgreSQL temporal (registro/login, CRUD de gastos,
resumen, privacidad y errores 400/401). Usa las credenciales de `backend/.env` o
del entorno, con permiso `CREATEDB`; no hace falta iniciar la API por separado.

GitHub Actions usa Node 22 en ambos jobs. `Backend (lint)` ejecuta lint e integración
con PostgreSQL 16; `Mobile (lint)` ejecuta los comandos de validación anteriores.
Los nombres se conservan porque son checks obligatorios de las reglas de rama.
Los bundles comprueban compilación de JavaScript, mientras que los módulos nativos
y las pantallas se validan también en un dispositivo.

## Widget de Android (HU-58, RF13)

El widget **Billo** muestra el total del mes (gastos + suscripciones, el mismo «Total» de Inicio). Solo existe en Android y en un build nativo (APK); **no aparece en Expo Go**.

**Cómo agregarlo:** mantén presionada una zona vacía de la pantalla de inicio del teléfono → **Widgets** → busca **Billo** → arrástralo a la pantalla.

**Cómo funciona**
- Se actualiza al abrir Inicio y al guardar, editar o eliminar un gasto.
- Tocarlo abre la app.
- Si no hay dato (sesión cerrada, mes nuevo sin abrir la app o error), muestra **«Abre Billo»**.
- Al cerrar sesión el dato se borra: el widget no muestra información del usuario anterior.
- Tras reiniciar el teléfono lo dibuja con el último dato guardado, sin abrir la app y sin red.

**Probarlo:** necesita el APK de release (`eas build --profile release`); en el build de desarrollo el widget depende de Metro y puede quedar vacío tras un reinicio (ver `docs/spike-rf11-rf13.md`, 2.4).

## Notificaciones push en Android (Firebase, HU-47)

Las push de Android necesitan dos cosas de Firebase. El servidor las envía con el servicio de Expo, así que no hay cambios en el backend.

1. **`google-services.json` en el build.** No está en el repo. Se sube a EAS como variable de tipo **archivo** y `app.config.js` la usa:
   ```
   cd mobile
   npx eas-cli env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment production --visibility sensitive
   ```
   (si pide el entorno del perfil `release`, usa `production`; en local basta con dejar el archivo en `mobile/google-services.json`, ya está en `.gitignore`).
2. **Credencial FCM V1 en EAS.** `npx eas-cli credentials` → Android → perfil `release` → *Google Service Account* → *Manage your Google Service Account Key for Push Notifications (FCM V1)* → subir la clave privada (JSON) de la cuenta de servicio de Firebase.

Después se reconstruye el APK (`npx eas-cli build --profile release --platform android`). Con el APK nuevo la app pide el permiso de notificaciones y registra el token. Expo Go no recibe push remotas.
