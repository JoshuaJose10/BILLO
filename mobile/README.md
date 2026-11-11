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
Los resultados del [spike de SDK 57](../docs/spike-rf11-rf13.md) son históricos;
repite voz, widget y reinicio en SDK 58 siguiendo la
[guía de migración](../docs/qa/sdk58-migracion.md).

### Notificaciones push (HU-47, RF7)

`expo-notifications` necesita Firebase Cloud Messaging en Android. **Paso pendiente:**
quien administre el proyecto de Firebase genera `google-services.json` para la app
`com.billo.app`, lo coloca en `mobile/` y agrega a `app.json`
`"android": { "googleServicesFile": "./google-services.json" }` antes del build.
Sin ese archivo la app funciona igual, solo que no obtiene token push.

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
