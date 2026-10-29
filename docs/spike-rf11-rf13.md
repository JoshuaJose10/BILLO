# Spike HU-23: voz, widget y cambio de moneda (RF11, RF12, RF13)

**Rama:** `spike/dev-build` · **Fecha:** 2026-10-28 · **Tipo:** prueba técnica, no es una función terminada.

**Objetivo:** saber si el registro por voz (RF12), el widget de Android (RF13) y el cambio de moneda (RF11) se pueden implementar con nuestro stack (Expo SDK 57, React Native 0.86, nueva arquitectura) en un *development build* de Android, sin romper el trabajo diario en Expo Go.

> Las casillas marcadas como **⏳ pendiente de probar en dispositivo** necesitan el APK del development build. Complétalas después de instalarlo (ver "Cómo probarlo" al final).

---

## 1. Resumen y decisión

| Requisito | Recomendación | Razón corta | Estimado Sprint 3 |
|-----------|---------------|-------------|-------------------|
| **RF11** Cambio de moneda | **IR** | La fuente se probó de punta a punta desde nuestro servidor: gratis, sin clave, incluye MXN y USD y responde en menos de 0.5 s. | 12 h |
| **RF12** Registro por voz | **IR** | Probado en dispositivo: reconoció la frase en es-MX en 5 de 5 intentos, con el permiso del micrófono en español. Librería mantenida, versionada por SDK y compatible con la nueva arquitectura. | 16 h |
| **RF13** Widget de Android | **IR** *(condicionado y con prioridad baja)* | Probado en dispositivo: aparece en el selector, muestra el dato guardado, se actualiza al instante y abre la app al tocarlo. **Pero después de reiniciar el dispositivo quedó vacío y la app se cerró con error** (ver 2.4). Antes de comprometer RF13 en el Sprint 3 hay que repetir esa prueba en un build de release. Además depende de un solo mantenedor. | 12 h |

**Cambiar a NO IR si en el dispositivo pasa algo de esto:**
- RF12: falla en es-MX en 2 o más de 5 intentos con la frase de prueba en un lugar silencioso, o el teléfono de prueba no tiene servicio de reconocimiento.
- RF13: en un build de release (con el JS dentro del APK) el widget sigue vacío o la app se cierra después de reiniciar el dispositivo.

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
| `eas build --profile development --platform android` | ✅ Build `d68cb1f1` en EAS (plan gratuito: ~23 min en fila más la compilación) |
| Instalar el APK y abrir la app | ✅ Abre, se conecta a Metro con `npm run start:dev-client` y la pantalla de pruebas muestra voz y widget disponibles (2026-10-28) |

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
| Abrir la app en Expo Go: login, inicio, nuevo gasto y perfil funcionan igual | ⏳ pendiente en Android con Expo Go para SDK 57. En **iPhone no se puede**: Expo Go de iOS ya es para SDK 58 y el proyecto (desde `develop`, no por el spike) usa SDK 57 ("Project is incompatible with this version of Expo Go") |
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
| Aparece el permiso del micrófono con el texto en español | ✅ |
| `es-MX` aparece como soportado en "Ver idiomas" | ⚠️ Respondió "no" en soportado y en instalado, aunque el reconocimiento en es-MX funcionó. Con el servicio en línea de Google, `getSupportedLocales` suele regresar listas vacías. **No usarlo para decidir si mostrar la voz**: mejor intentar y manejar el error `language-not-supported`. Desde `5a6b96c` la pantalla muestra cuántos idiomas regresó la lista |
| Texto reconocido (5 intentos) | ✅ **5 de 5 correctos**: "$50 en tacos", "50 pesos en tacos", "$50 en tacos", "$50 en tacos", "$50 en tacos". El reconocedor convierte "cincuenta pesos" en número (con o sin `$`) |
| Tiempo desde que terminas de hablar hasta el resultado final | No se midió; el texto parcial aparece mientras se habla |
| Funciona sin internet | No se probó (opcional). Como no hay idioma instalado sin conexión, se espera que **no** funcione sin internet |

Nota (confirmada en dispositivo): el reconocedor escribe montos con formato, por ejemplo "cincuenta pesos" → "$50". Por eso el indicador "Coincide con la frase" dice "no" aunque el reconocimiento sea correcto. El parser del Sprint 3 debe aceptar `$50`, `50 pesos` y `cincuenta pesos`; esto lo simplifica, porque el monto suele llegar ya como número.

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
| El widget "Billo" aparece en el selector de widgets del launcher | ✅ |
| Al agregarlo muestra el texto fijo y el último dato guardado | ✅ Muestra "BILLO · TOTAL DEL MES" y "$1,234.50 (prueba)", guardado antes de agregar el widget: la tarea en segundo plano lee el dato sin abrir la app |
| "Guardar y actualizar widget" cambia el dato en menos de 2 s | ✅ Al instante |
| El dato sigue ahí después de cerrar la app y reiniciar el teléfono | ❌ **Falló en el development build:** después de reiniciar, el widget quedó vacío (sin contenido) y Android mostró "Billo se cerró debido a un error". Se tocó "Eliminar caché". **El dato sí se conservó:** después del reinicio, la pantalla de pruebas leyó `$999.00`, el último texto guardado. Lo que falla es solo dibujar el widget al arrancar, no el almacenamiento. **Causa probable (no confirmada):** al reiniciar, Android ejecuta la tarea en segundo plano del widget, y en un development build el JS no viene en el APK sino de Metro; si Metro no estaba disponible, la tarea falla. En un build de release el JS va dentro del APK. ⏳ Verificar en un build de release y, si vuelve a fallar, sacar el log con `adb logcat` |
| Tocar el widget abre Billo | ✅ Al instante |

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
| RF13 | Diseño final del widget y imagen de vista previa (3 h), calcular y guardar el total del mes al crear, editar o borrar gastos (3 h), almacenamiento no seguro para el dato (1 h), pruebas en 2 launchers (3 h), **antes de empezar:** repetir la prueba de reinicio en un build de release (2 h) | **12** |
| Común | Builds de EAS, distribuir el APK a QA y ajustar el flujo con development build | **4** |
| **Total** | | **44** |

---

## 5. Riesgos

1. **Flujo de trabajo:** RF12 y RF13 no se pueden probar en Expo Go. QA y quien desarrolle esas pantallas necesitan el APK y un build nuevo cada vez que cambie algo nativo (librería o `app.json`). Los cambios solo de JS no necesitan otro build.
2. **Plan gratuito de EAS:** los builds en la nube tienen un cupo mensual y cola de espera. Revisar el cupo del plan gratuito en expo.dev antes del sprint. `eas build --local` no corre en Windows.
3. **RF12 depende del servicio de Google:** en Android usa el reconocedor del sistema (normalmente la app de Google). Teléfonos sin servicios de Google o sin el paquete de es-MX pueden fallar. El audio se procesa en los servidores de Google salvo que el modelo sin conexión esté instalado (Android 13+): hay que mencionarlo en el aviso de privacidad.
4. **RF13, un solo mantenedor:** `react-native-android-widget` depende de una persona. Hay un issue abierto sobre crash en builds de release con Expo SDK 58 / AGP 9 (R8). Con SDK 57 no aplica, pero hay que revisarlo antes de actualizar. Alternativa: `expo-widgets` (oficial) en SDK 58.
5. **RF13, reinicio del dispositivo:** en el development build el widget quedó vacío y la app se cerró después de reiniciar (sección 2.4). Hasta probarlo en release no se sabe si es un problema del development build o de la librería. Hay un issue abierto parecido (ANR en `HeadlessJsTaskWorker.startWork`).
6. **RF13, actualizaciones:** Android limita la actualización automática a 30 minutos como mínimo; el total se debe actualizar desde la app cada vez que cambia un gasto. Algunos launchers con ahorro de batería agresivo (por ejemplo Xiaomi o Huawei) pueden restringir las tareas en segundo plano.
7. **RF11, tasa diaria:** el BCE publica una tasa por día hábil (no hay tasa en fin de semana ni en tiempo real). Para un control de gastos personal es suficiente, pero hay que mostrar la fecha de la tasa. Si la fuente cae, se usa el respaldo o la última tasa guardada.
8. **Expo Go en iPhone ya no sirve con SDK 57:** la App Store solo ofrece la versión más reciente de Expo Go (SDK 58). Quien use iPhone necesita un development build de iOS (requiere cuenta de Apple Developer) o actualizar el proyecto a SDK 58. Esto no lo causa el spike, pero hace más urgente decidir entre development build y migrar a SDK 58. Si se migra, revisar el issue abierto de `react-native-android-widget` con SDK 58 (riesgo 4).
9. **`android.package` es permanente:** `com.billo.app` no se puede cambiar después de publicar en Google Play.

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

**Dispositivo de prueba:** Samsung Galaxy Tab S9 FE (SM-X510), Android ⏳ _versión_. Pruebas del 2026-10-28 con el development build `d68cb1f1`.
