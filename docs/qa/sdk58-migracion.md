# Migración y validación: Expo SDK 58

Fecha: 2026-11-04. Alcance: dependencias de mobile, documentación, integración
HTTP mobile/API y GitHub Actions. Los resultados del
[spike de SDK 57](../spike-rf11-rf13.md) se conservan como evidencia histórica.

## Versiones y decisiones

| Componente | SDK 57 | SDK 58 |
|---|---|---|
| Expo | ~57.0.31 | ~58.0.23 |
| React Native | 0.86.3 | 0.88.1 |
| React | 19.2.3 | 19.3.0 |
| Node en CI | 20 | 22 desde `.nvmrc` (mínimo 22.13) |
| Reconocimiento de voz | ~57.1.1 | ~58.0.1 |
| Widget Android | ~0.25.0 | ~0.26.0 |

Los módulos oficiales de Expo y las librerías incluidas en su matriz se alinean
con `expo install --fix`; las versiones exactas quedan en `mobile/package-lock.json`.
No todas las librerías usan la numeración del SDK. La voz se actualiza de forma
explícita a su rama 58. El widget se mantiene en la misma librería, actualizada a
0.26.0: el mantenedor reportó la corrección del crash de release de SDK 58/AGP 9
al actualizar WorkManager. Esto requiere confirmación en el APK de Billo.

## Reproducir la validación

Usar Node 22.13 o superior dentro de la rama 22; `.nvmrc` selecciona esa rama.
Instalar con `npm ci` para respetar los lockfiles. En PowerShell se puede usar
`npm.cmd`/`npx.cmd` si la política local bloquea los scripts `.ps1`.

Desde `mobile`:

```bash
npm ci
npm run check:sdk
npm run doctor
npm run lint
npm test
npm run verificar:temas
npm run test:bundle
```

Configurar `EXPO_PUBLIC_API_URL` en `mobile/.env` para abrir la app. En CI se usa
una URL local ficticia solo para generar el bundle: el job móvil no llama a la API.
No usar `NODE_ENV=test` para seleccionar el archivo `.env` de Expo: SDK 58 define
el modo según el comando. Los bundles de Android e iOS se generan en `mobile/dist/`,
que no se versiona. Exportar JavaScript no compila ni ejecuta un APK/IPA.

Desde `backend`, con PostgreSQL activo y credenciales de un usuario con `CREATEDB`:

```bash
npm ci
npm run lint
npm test
```

La suite crea, migra y elimina su propia base temporal. Incluye 120 casos previos
(auth, gastos y resumen) y 6 casos nuevos de integración del cliente móvil real:

- Registro, login y perfil con JWT.
- CRUD de gastos con persistencia y actualización del resumen mensual.
- Aislamiento entre usuarios A/B.
- Error 400 sin persistencia ni cierre de sesión.
- Error 401 autenticado con el token de la sesión rechazada.
- Login incorrecto sin cerrar otra sesión.

Se importan `mobile/src/services/api.js` y `auth.js`, y se ejecuta `fetch` contra
Express en un puerto aleatorio y PostgreSQL real. No se simulan sus respuestas.
Esta suite no carga React Native, Expo Go, SecureStore ni los módulos de voz/widget.

## GitHub Actions

El workflow `.github/workflows/ci.yml` conserva los checks obligatorios
`Backend (lint)` y `Mobile (lint)`. Ambos usan `.nvmrc` y `npm ci`.
Backend ejecuta lint y las 126 pruebas de integración con PostgreSQL 16.
Mobile ejecuta lint, comprobación de versiones, Expo Doctor, las 66 pruebas
unitarias, verificación de temas y exportación de Android/iOS. Los fallos hacen
fallar el job; no se omiten aserciones para obtener un resultado verde.

## Resultado local

Ambiente: Windows, Node 22.15.0, npm 10.9.2; rama `chore/mobile-sdk58`.
Validación local ejecutada el 2026-11-04.

| Verificación | Resultado |
|---|---|
| Instalación reproducible mobile y backend (`npm ci`) | Pasa |
| Dependencias (`check:sdk`) | Pasa: dependencias alineadas con SDK 58 |
| Expo Doctor | Pasa: 20/20 comprobaciones |
| Lint mobile/backend | Pasa: ambos comandos terminan con código 0 |
| Mobile: 66 pruebas unitarias | Pasa: 66/66, sin omitidas |
| Backend + cliente mobile: 126 pruebas de integración | Pasa: 126/126, sin omitidas (29.3 s con instalación limpia) |
| Temas | Pasa: 83 claves iguales en claro y oscuro |
| Bundles Android/iOS | Pasa: 1735 módulos Android y 1729 iOS; ambos generan bytecode Hermes en `dist/` |
| GitHub Actions remoto | Pendiente de subir la rama y ejecutar el workflow |

## Pruebas en dispositivo

Registrar commit, modelo, sistema operativo, versión de Expo Go o ID de build,
fecha, responsable y evidencia. No reutilizar el APK de SDK 57. Para voz/widget,
generar e instalar un development build nuevo con el perfil `development` de
`mobile/eas.json`; los cambios nativos requieren otro binario.

| Caso | Pasos y resultado esperado | Estado |
|---|---|---|
| SDK58-01 | Abrir en Expo Go compatible con SDK 58; ejecutar registro/login, guardar un gasto y consultar lista/resumen. Datos persistidos, sin pantalla roja. Referencia CP-RF1-01/02, CP-RF2-01 y CP-RF6-01/02. | Pendiente |
| SDK58-02 | Abrir Perfil → Laboratorio en Expo Go. Voz y widget indican que requieren development build; no aparece error de módulo nativo. | Pendiente |
| SDK58-03 | En development build nuevo, aceptar micrófono y reconocer «cincuenta pesos en tacos» en es-MX cinco veces; registrar textos y rechazar permiso una vez para comprobar el manejo del error. | Pendiente |
| SDK58-04 | Agregar widget Billo, guardar/actualizar el dato y tocarlo. El dato cambia y se abre la app. | Pendiente |
| SDK58-05 | En un build de release de SDK 58, abrir la app y actualizar el widget; cerrar, reiniciar el dispositivo y volver a revisarlo. Sin crash de arranque ni widget vacío. Guardar logcat si falla. | Pendiente |
| SDK58-06 | En Android e iOS, recorrer navegación, selector de fecha, teclado, animaciones y áreas seguras; sin cierres ni controles inaccesibles. En iOS no se espera el widget Android. | Pendiente |

El perfil EAS existente genera un development build, no un release. El caso
SDK58-05 requiere preparar un build de release y no queda cubierto por ese perfil.
Los pendientes de dispositivo no equivalen a aprobados por las pruebas de Node.

## Fuentes

- [Guía oficial de actualización de Expo](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).
- [Cambios y requisitos de SDK 58](https://expo.dev/changelog/sdk-58).
- [Instalación de expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition#installation).
- [Corrección del widget en 0.26.0, issue #159](https://github.com/sAleksovski/react-native-android-widget/issues/159).
