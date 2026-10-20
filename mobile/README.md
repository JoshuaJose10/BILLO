# Billo — App móvil

App React Native / Expo de Billo.

## Requisitos

- [Node.js](https://nodejs.org/) 20 LTS
- [Git](https://git-scm.com/)
- La app **Expo Go** en tu teléfono (o un emulador de Android Studio)

## Instalar y correr

Desde la carpeta `mobile`:

```bash
npm install
npx expo start
```

Escanea el código QR con Expo Go (teléfono y computadora en la misma red Wi-Fi). En un emulador de Android, presiona `a` en la terminal.

Si la red bloquea la conexión (Wi-Fi de la escuela o red pública), usa el modo túnel:

```bash
npx expo start --tunnel
```

> En Windows, si PowerShell bloquea `npx` por la política de scripts, usa `npx.cmd`.

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

El botón "Entrar" de Login es temporal; HU-13 lo reemplaza por el login real.

## Lint y formato

```bash
npm run lint     # ESLint, debe terminar sin errores
npm run format   # Prettier, da formato a todo el código
```
