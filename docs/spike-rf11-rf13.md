# Spike HU-23: voz, widget y cambio de moneda (RF11, RF12, RF13)

**Rama:** `spike/dev-build` · **Fecha:** 2026-10-28 · **Tipo:** prueba técnica, no es una función terminada.

**Objetivo:** saber si el registro por voz (RF12), el widget de Android (RF13) y el cambio de moneda (RF11) se pueden implementar con nuestro stack (Expo SDK 57, React Native 0.86, nueva arquitectura) en un *development build* de Android, sin romper el trabajo diario en Expo Go.

> Las casillas marcadas como **⏳ pendiente de probar en dispositivo** necesitan el APK del development build. Complétalas después de instalarlo (ver "Cómo probarlo" al final).

---

## 1. Resumen y decisión

| Requisito | Recomendación | Razón corta | Estimado Sprint 3 |
|-----------|---------------|-------------|-------------------|
| **RF11** Cambio de moneda | **IR** | La fuente se probó de punta a punta desde nuestro servidor: gratis, sin clave, incluye MXN y USD y responde en menos de 0.5 s. | 12 h |
| **RF12** Registro por voz | **IR** *(provisional hasta probar en dispositivo)* | Librería mantenida y versionada por SDK, módulo de Expo compatible con la nueva arquitectura; el plugin configura permisos y el build lo genera bien. Falta confirmar la calidad del reconocimiento en es-MX. | 16 h |
| **RF13** Widget de Android | **IR** *(provisional y con prioridad baja)* | La librería genera el widget y su tarea en segundo plano; el prebuild sale bien. Es la parte con más riesgo: depende de un solo mantenedor y `expo-widgets` (oficial) apenas soporta Android desde SDK 58. | 10 h |

**Cambiar a NO IR si en el dispositivo pasa algo de esto:**
- RF12: falla en es-MX en 2 o más de 5 intentos con la frase de prueba en un lugar silencioso, o el teléfono de prueba no tiene servicio de reconocimiento.
- RF13: el widget no aparece en el selector, no se actualiza al tocar "Guardar y actualizar widget" o la app se cierra sola (crash/ANR) al agregarlo.

---

## 2. Qué se probó y resultados

### 2.1 Development build (base de RF12 y RF13)

| Prueba | Resultado |
|--------|-----------|
| `android.package` = `com.billo.app` en `mobile/app.json` | ✅ Agregado |
| `eas.json` con perfil `development` (`developmentClient: true`, `distribution: internal`, `android.buildType: apk`) | ✅ Creado |
| `expo-dev-client` instalado con `npx expo install` (versión de SDK 57) | ✅ |
| `npx expo config` lee la configuración con los plugins nuevos | ✅ Sin errores |
| `npx expo prebuild --platform android` (local, sin subir la carpeta `android/`) | ✅ Genera el proyecto con `newArchEnabled=true`, el permiso `RECORD_AUDIO`, la visibilidad de `com.google.android.googlequicksearchbox` y el receiver `.widget.ResumenMes` con su `widgetprovider_resumenmes.xml` |
| `npx expo export --platform android` (el bundle de JS compila) | ✅ 1415 módulos |
| `eas build --profile development --platform android` | ⏳ pendiente: necesita la sesión de Expo de Joshua |
| Instalar el APK y abrir la app | ⏳ pendiente de probar en dispositivo |

### 2.2 Expo Go sigue funcionando

Todo lo nativo vive en `mobile/src/spike/` y se carga con `require` dentro de `try/catch` (`src/spike/modulosNativos.js`). Las pantallas actuales no importan nada nativo nuevo.

- `react-native-android-widget` **lanza un error al importarse** en Expo Go (usa `TurboModuleRegistry.getEnforcing`). Por eso ni `index.js` ni la pantalla de pruebas lo importan directamente: `registrarWidget()` y `cargarWidget()` lo cargan protegidos.
- `expo-speech-recognition` también lanza un error al importarse sin el módulo nativo (`requireNativeModule`). Se carga igual, con `cargarVoz()`.
- Con `expo-dev-client` instalado, `expo start` abre el development build por defecto. Para no cambiar el trabajo diario, **`npm start` ahora corre `expo start --go`** (y `npm run android`, `expo start --go --android`). Para el APK del spike se usa `npm run start:dev-client`.
- Los config plugins solo se aplican al generar el build nativo; no afectan Expo Go.

| Prueba | Resultado |
|--------|-----------|
| `npm run lint` en mobile | ✅ |
| El bundle de Android compila con los imports protegidos | ✅ |
| Abrir la app en Expo Go: login, inicio, nuevo gasto y perfil funcionan igual | ⏳ pendiente de probar en dispositivo (no se pudo abrir Expo Go desde la máquina del spike) |
| En Expo Go, Perfil → "Laboratorio (spike)" muestra "No disponible: requiere el development build" en voz y widget, sin pantalla roja | ⏳ pendiente de probar en dispositivo |

La pantalla **Laboratorio (spike)** solo se registra con `__DEV__`, así que no aparece en un build de producción.

### 2.3 RF12: Voz

**Librería elegida:** [`expo-speech-recognition`](https://github.com/jamsch/expo-speech-recognition) **57.1.1** (`~57.1.1`).

Por qué esta:
- Es un módulo de Expo (Expo Modules API), compatible con la nueva arquitectura sin capa de compatibilidad.
- Publica una versión por SDK: el README indica `expo-speech-recognition@^57.0.0` para SDK 57. Ojo: `npx expo install` instaló la **58.0.0** (para SDK 58); se fijó a mano la `~57.1.1`.
- Trae config plugin para los permisos y textos en español.
- Alternativa no elegida: `@react-native-voice/voice` 3.2.4 (última publicación en npm: 2026-01). No se evaluó a fondo porque no publica versiones por SDK de Expo y `expo-speech-recognition` ya cubre lo necesario.

**Pantalla de prueba:** Perfil → "Laboratorio (spike)" → sección "Voz (RF12)". Pide permiso de micrófono, revisa `isRecognitionAvailable()`, escucha con `lang: 'es-MX'`, `interimResults: true` y `contextualStrings: ['pesos', 'tacos']`, y muestra el texto reconocido. El botón "Ver idiomas" indica si `es-MX` está soportado e instalado para uso sin conexión.

| Prueba (frase: "cincuenta pesos en tacos") | Resultado |
|--------------------------------------------|-----------|
| Se instala y el prebuild agrega `RECORD_AUDIO` y la consulta al servicio de Google | ✅ |
| Aparece el diálogo de permiso del micrófono con el texto en español | ⏳ pendiente de probar en dispositivo |
| `es-MX` aparece como soportado en "Ver idiomas" | ⏳ pendiente de probar en dispositivo |
| Texto reconocido (escribir lo que salió en 5 intentos) | ⏳ pendiente de probar en dispositivo |
| Tiempo desde que terminas de hablar hasta el resultado final | ⏳ pendiente de probar en dispositivo |
| Funciona sin internet | ⏳ pendiente de probar en dispositivo |

Nota: el reconocedor de Google suele escribir los números con dígitos ("50 pesos en tacos"), así que el indicador "Coincide con la frase" puede decir "no" aunque el reconocimiento sea correcto. El parser del Sprint 3 debe aceptar dígitos y números escritos con palabras.

### 2.4 RF13: Widget de Android

**Opciones evaluadas:**

| Opción | Android en SDK 57 | Decisión |
|--------|-------------------|----------|
| `expo-widgets` (oficial) 57.0.x | ❌ La documentación de SDK 57 dice que es **solo iOS**. Android aparece desde SDK 58. | Descartada por ahora; revisar al migrar a SDK 58 |
| [`react-native-android-widget`](https://github.com/sAleksovski/react-native-android-widget) **0.25.0** | ✅ Peer `expo >= 54`, config plugin propio, TurboModule (nueva arquitectura); los issues de la nueva arquitectura están cerrados. Su ejemplo oficial usa SDK 55 / RN 0.83 | **Elegida** (`~0.25.0` para evitar cambios de minor en 0.x) |
| `@bittingz/expo-widgets` 3.0.2 | Sin actualizaciones desde 2025-07 | Descartada |

**Widget mínimo** (`src/spike/widget/`):
- `ResumenMes`: tarjeta oscura con el texto fijo "BILLO · TOTAL DEL MES" y el dato guardado desde la app. Al tocarlo abre Billo.
- La pantalla de pruebas guarda el texto (por defecto `$1,234.50 (prueba)`) y llama a `requestWidgetUpdate`.
- `widgetTaskHandler` lee el mismo dato cuando Android agrega, actualiza o cambia el tamaño del widget, sin abrir la app.
- Se registra en `index.js` con `registrarWidget()` (sin efecto en Expo Go).

| Prueba | Resultado |
|--------|-----------|
| El prebuild genera el receiver y el XML del widget | ✅ |
| El widget "Billo" aparece en el selector de widgets del launcher | ⏳ pendiente de probar en dispositivo |
| Al agregarlo muestra el texto fijo y "Sin datos: abre Billo" (o el último dato guardado) | ⏳ pendiente de probar en dispositivo |
| "Guardar y actualizar widget" cambia el dato en menos de 2 s | ⏳ pendiente de probar en dispositivo |
| El dato sigue ahí después de cerrar la app y reiniciar el teléfono | ⏳ pendiente de probar en dispositivo |
| Tocar el widget abre Billo | ⏳ pendiente de probar en dispositivo |

### 2.5 RF11: Cambio de moneda

**Fuentes comparadas** (curl desde la máquina de desarrollo, 3 peticiones cada una, 2026-10-28):

| Fuente | ¿Clave? | MXN/USD | Tiempo | Límites de uso | Notas |
|--------|---------|---------|--------|----------------|-------|
| **Frankfurter** `api.frankfurter.dev/v1/latest?base=USD&symbols=MXN` | No | ✅ 1 USD = 18.6311 MXN | 1.04 s (primera, con TLS), 0.28 s, 0.22 s | Sin cuotas diarias ni mensuales; limita por abuso sin publicar un número. Recomienda guardar en caché | Datos del Banco Central Europeo, se actualizan una vez al día hábil. Código abierto: se puede autoalojar. No pide atribución. El dominio viejo `api.frankfurter.app` responde 301 |
| ExchangeRate-API open access `open.er-api.com/v6/latest/USD` | No | ✅ 18.673405 | 0.62 s, 0.19 s, 0.24 s | Con más de una petición por hora puede responder 429 durante 20 minutos | **Exige atribución** con enlace en la app. Actualiza cada 24 h |
| fawazahmed0 currency-api (jsDelivr) | No | ✅ | 0.33 s, 0.29 s, 0.20 s | Sin límites publicados (CDN) | Proyecto comunitario sin garantía; respuesta de ~200 monedas |

**Propuesta:** Frankfurter como fuente principal y ExchangeRate-API como respaldo (agregando la atribución) si Frankfurter falla.

**Endpoint experimental:** `GET /tipo-cambio?de=USD&a=MXN` (`backend/src/controllers/tipoCambio.controller.js`).
- **EXPERIMENTAL:** no está en `docs/api-contrato.md`, no pide token y puede cambiar o eliminarse en el Sprint 3.
- Se agregó para probar que el servidor responde (sin depender del teléfono) y para dejar la caché en un solo lugar: 1 hora en memoria y un tiempo máximo de 5 s hacia la fuente.

| Prueba (servidor local, curl) | Resultado |
|-------------------------------|-----------|
| `?de=USD&a=MXN`, primera vez | ✅ 200 `{"de":"USD","a":"MXN","tasa":18.6311,"fecha":"2026-10-28","fuente":"frankfurter.dev (BCE)","cache":false}` en **0.46 s** |
| Misma consulta, segunda vez | ✅ 200 con `"cache":true` en **0.001 s** |
| `?de=MXN&a=USD` | ✅ 200, `tasa: 0.053674` en 0.10 s |
| `?de=USD&a=XYZ` | ✅ 400 `MONEDA_NO_SOPORTADA` |
| `?de=US&a=MXN` | ✅ 400 `MONEDA_INVALIDA` |
| La fuente no responde | ✅ por código: 502 `FUENTE_NO_DISPONIBLE` (no se simuló una caída) |
| Llamarlo desde la app en el teléfono | ⏳ pendiente (no hace falta development build: funciona en Expo Go) |

---

## 3. Librerías y versiones

| Paquete | Versión | Para qué | Funciona en Expo Go |
|---------|---------|----------|---------------------|
| expo | 57.0.30 | — | — |
| react-native | 0.86.3 (nueva arquitectura) | — | — |
| expo-dev-client | ~57.0.20 | Development build | No aplica |
| expo-speech-recognition | ~57.1.1 | RF12 voz | ❌ |
| react-native-android-widget | ~0.25.0 | RF13 widget | ❌ |
| expo-secure-store | ~57.0.4 (ya estaba) | Dato compartido con el widget (solo para el spike) | ✅ |
| Frankfurter API | v1 | RF11 tipo de cambio | ✅ (es HTTP) |
| eas-cli | 27.1.0 (`npx eas-cli`) | Builds en la nube | — |

---

## 4. Estimado para el Sprint 3 (horas)

| Requisito | Tareas | Horas |
|-----------|--------|-------|
| RF11 | Migración `moneda` en gastos (2 h), validación y contrato (2 h), endpoint definitivo con respaldo y caché (2 h), selector de moneda y conversión en la app (4 h), pruebas (2 h) | **12** |
| RF12 | Pantalla o botón de voz en Nuevo gasto (4 h), parser de español: números en dígitos y en palabras, categoría, "pesos/dólares" (8 h), manejo de permisos y errores (2 h), pruebas en dispositivo (2 h) | **16** |
| RF13 | Diseño final del widget y imagen de vista previa (3 h), calcular y guardar el total del mes al crear, editar o borrar gastos (3 h), almacenamiento no seguro para el dato (1 h), pruebas en 2 launchers (3 h) | **10** |
| Común | Builds de EAS, distribuir el APK a QA y ajustar el flujo con development build | **4** |
| **Total** | | **42** |

---

## 5. Riesgos

1. **Flujo de trabajo:** RF12 y RF13 no se pueden probar en Expo Go. QA y quien desarrolle esas pantallas necesitan el APK y un build nuevo cada vez que cambie algo nativo (librería o `app.json`). Los cambios solo de JS no necesitan otro build.
2. **Plan gratuito de EAS:** los builds en la nube tienen un cupo mensual y cola de espera. Revisar el cupo del plan gratuito en expo.dev antes del sprint. `eas build --local` no corre en Windows.
3. **RF12 depende del servicio de Google:** en Android usa el reconocedor del sistema (normalmente la app de Google). Teléfonos sin servicios de Google o sin el paquete de es-MX pueden fallar. El audio se procesa en los servidores de Google salvo que el modelo sin conexión esté instalado (Android 13+): hay que mencionarlo en el aviso de privacidad.
4. **RF13, un solo mantenedor:** `react-native-android-widget` depende de una persona. Hay un issue abierto sobre crash en builds de release con Expo SDK 58 / AGP 9 (R8). Con SDK 57 no aplica, pero hay que revisarlo antes de actualizar. Alternativa: `expo-widgets` (oficial) en SDK 58.
5. **RF13, actualizaciones:** Android limita la actualización automática a 30 minutos como mínimo; el total se debe actualizar desde la app cada vez que cambia un gasto. Algunos launchers con ahorro de batería agresivo (por ejemplo Xiaomi o Huawei) pueden restringir las tareas en segundo plano.
6. **RF11, tasa diaria:** el BCE publica una tasa por día hábil (no hay tasa en fin de semana ni en tiempo real). Para un control de gastos personal es suficiente, pero hay que mostrar la fecha de la tasa. Si la fuente cae, se usa el respaldo o la última tasa guardada.
7. **`android.package` es permanente:** `com.billo.app` no se puede cambiar después de publicar en Google Play.

---

## 6. Cómo probarlo

### Generar el APK (Joshua, una sola vez)
```bash
cd mobile
npx eas-cli login
npx eas-cli init          # agrega extra.eas.projectId a app.json: hacer commit de ese cambio
npx eas-cli build --profile development --platform android
```
Al terminar, EAS da un enlace y un QR para descargar el APK.

### Probar en el teléfono (QA)
1. Instalar el APK desde el enlace de EAS (permitir "instalar apps de origen desconocido").
2. En la computadora: `cd mobile && npm run start:dev-client`. Abrir la app "Billo" instalada y escanear el QR o elegir el servidor (misma red Wi-Fi).
3. Iniciar sesión → avatar → **Perfil** → **Laboratorio (spike)**.
4. **Voz:** "Ver idiomas" → anotar el resultado. "Escuchar (es-MX)" → aceptar el permiso → decir "cincuenta pesos en tacos". Repetir 5 veces y anotar el texto de cada intento.
5. **Widget:** escribir un texto → "Guardar y actualizar widget". Mantener presionada la pantalla de inicio → Widgets → "Billo" → agregarlo. Volver a la app, cambiar el texto y comprobar que el widget cambia. Cerrar la app, reiniciar el teléfono y revisar que el dato siga ahí. Tocar el widget: debe abrir Billo.
6. Llenar las casillas ⏳ de este documento con lo que pasó (y el modelo del teléfono y la versión de Android).

### Probar el tipo de cambio (backend)
```bash
cd backend && npm run dev
curl -w "\n%{time_total}s\n" "http://localhost:3000/tipo-cambio?de=USD&a=MXN"
```

**Teléfono de prueba:** ⏳ _modelo / versión de Android_
