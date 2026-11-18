# HU-79: entorno de QA de suscripciones por USB

Alcance: mejoras de suscripciones HU-71 a HU-78 y regresion del total mensual
y Reportes. Contrato de referencia: [v1.11](../api-contrato.md). Esta guia prepara
el entorno; los resultados del APK se registran al ejecutar cada caso.

## Preparacion de Windows

Instalar scrcpy para el usuario actual; el paquete de Windows incluye ADB:

```powershell
winget install --id Genymobile.scrcpy --exact --source winget --scope user --silent --accept-source-agreements --accept-package-agreements --disable-interactivity
```

El script del proyecto encuentra las herramientas instaladas por WinGet incluso
si la terminal no ha actualizado su PATH. No requiere Android Studio ni Metro
para probar un APK de release. No hace falta instalar otro ADB.

## Conectar el telefono

1. En Ajustes, buscar Numero de compilacion y tocarlo siete veces para activar
   Opciones de desarrollador. Puede pedir el PIN. En algunos Xiaomi se toca la
   version de MIUI/OS; la ubicacion depende del fabricante.
2. En Opciones de desarrollador, activar Depuracion USB.
3. Conectar un cable USB de datos, desbloquear y aceptar Permitir depuracion USB
   para esta computadora. Si el dispositivo lo requiere, seleccionar transferencia
   de archivos en el menu USB.
4. Desde la raiz del repositorio, comprobar:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\mobile\scripts\qa-android.ps1 estado
   ```

`-ExecutionPolicy Bypass` solo afecta ese proceso; no cambia la politica del equipo.
El estado debe ser `device`. `unauthorized` significa que falta aceptar el aviso
en el telefono: desbloquear y reconectar si no aparece. `offline` requiere
reconectar. Si no se detecta, probar otro cable/puerto y comprobar el controlador
USB del fabricante. Con varios dispositivos, agregar `-Dispositivo IDENTIFICADOR`
a los comandos. Los identificadores se consultan localmente, no se incluyen en el reporte.

## Operar y guardar evidencias

Desde la raiz del repositorio:

```powershell
# Ver y controlar el telefono en una ventana; cerrar la ventana termina la sesion.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\mobile\scripts\qa-android.ps1 espejo

# Capturar el estado visible. Sustituir caso y paso por los de la matriz de QA.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\mobile\scripts\qa-android.ps1 captura -Caso CP-HU71-01 -Paso 01-total-inicial

# Instalar o actualizar el APK identificado por el equipo y mostrar su SHA-256.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\mobile\scripts\qa-android.ps1 instalar -Apk 'C:\ruta\Billo.apk'
```

Las capturas se guardan en `docs/qa/hu79-evidencias/<caso>/` como PNG, con fecha
UTC y sufijo unico. El script verifica su firma PNG y elimina solo su copia
temporal del telefono. Capturar pantallas de QA sin credenciales ni datos personales.
Una captura acredita el estado visible; anotar tambien las acciones y valores reales.

`instalar` usa `adb install -r`, que solicita conservar los datos. Si falla por
firma distinta o downgrade, conservar el error y conseguir un APK compatible;
no desinstalar ni borrar datos automaticamente.

Antes de ejecutar HU-79, registrar modelo/Android, version y versionCode del APK,
enlace/build y hash si se dispone del archivo, API del binario y commit si esta
identificado. La version visible por si sola no acredita las HU incluidas.
Confirmar el alcance con el tablero y separar no incluidas de casos bloqueados.
El perfil release del repositorio apunta a la API en linea: cambiar `.env` en la
PC o conectar el USB no cambia la API de un APK instalado.

## Verificacion automatica

Node requerido por el proyecto: rama 22, version 22.13 o posterior. Las pruebas
de mobile no necesitan telefono ni API. Las del backend usan PostgreSQL y las
credenciales de `backend/.env`, con permiso para crear una base temporal.

Ejecutar en dos terminales independientes:

```powershell
# Terminal 1
cd mobile
npm.cmd test
```

```powershell
# Terminal 2
cd backend
npm.cmd run test:membresias-reportes
```

Si faltan dependencias, ejecutar `npm.cmd ci` en la carpeta correspondiente.
La suite dedicada del backend crea y elimina su propia base temporal; no usa
la base de desarrollo como destino. Para la regresion completa del backend,
ejecutar `npm.cmd test` desde `backend` sobre la version candidata.

La automatizacion comprueba logica y API. Cada caso manual sigue necesitando
pasos, esperado, real, estado y evidencia del APK. Cada falla debe enlazar un
bug creado con la [plantilla](../plantilla-reporte-bug.md).

## Comprobacion de preparacion del 2026-11-18

- Windows: scrcpy 5.0.1 instalado con WinGet; hash del paquete verificado por WinGet.
- ADB incluido: 1.0.41 / Platform Tools 37.0.1.
- Conexion USB autorizada: Samsung SM-A530F, Android 9, estado `device`.
- Billo instalado: version 1.0.1, versionCode 2. Build/commit y mejoras incluidas
  pendientes de identificar antes de la ejecucion funcional.
- Ventana de scrcpy abierta y respondiendo; captura PNG transferida y revisada
  con Inicio de Billo visible. Ver [evidencia de preparacion](hu79-evidencias/ENTORNO-USB/README.md).
- La API documentada en el perfil release respondio HTTP 200 en `/health`.
  Esto no identifica por si solo la API incluida en el APK instalado.
- Node 22.15.0, npm 10.9.2 y dependencias de mobile/backend presentes.
- Servicio PostgreSQL 17 activo; conexion y creacion de base temporal verificadas
  mediante la suite dedicada.
- `mobile: npm.cmd test`: 570 pruebas pasan, 0 fallas, 0 omitidas; salida 0.
- `backend: npm.cmd run test:membresias-reportes`: 84 pruebas pasan, 0 fallas,
  0 omitidas; salida 0.

Estas comprobaciones preparan el entorno local. No son el reporte de ejecucion
de HU-79 en el APK y no actualizan resultados historicos de otras entregas.

## Validacion previa al PR del 2026-11-18

En la rama `test/hu79-qa-suscripciones-usb`, con Node 22.15.0:

| Comprobacion | Resultado local |
|---|---|
| Backend: `npm.cmd run lint` | Salida 0 |
| Backend: `npm.cmd test` | 505 pruebas pasan, 0 fallas, 0 omitidas; PostgreSQL temporal; salida 0 |
| Mobile: `npm.cmd run lint` | Salida 0 |
| Mobile: `npm.cmd run check:sdk` | Dependencias actualizadas; salida 0 |
| Mobile: `npm.cmd run doctor` | 20/20 comprobaciones; salida 0 |
| Mobile: `npm.cmd run verificar:temas` | 89 claves iguales en claro/oscuro; salida 0 |
| Mobile: `npm.cmd run test:bundle` | Bundles Android e iOS generados; salida 0 |
| Script PowerShell | Analisis de sintaxis correcto; captura y conexion comprobadas durante la preparacion |
| Reporte, bitacora, bug y guia | 56 enlaces locales validos; `git diff --check` sin errores |

Las 570 pruebas de mobile y las 84 de la suite dedicada corresponden a la
preparacion documentada arriba; no se repitieron para este PR porque no se
modifico la logica de la aplicacion. La suite completa del backend incluye
la dedicada: sus conteos no se suman. El estado del CI remoto se consulta en el PR.

Fuentes de instalacion y uso:
[scrcpy para Windows](https://github.com/Genymobile/scrcpy/blob/master/doc/windows.md),
[Android Debug Bridge](https://developer.android.com/tools/adb) y
[Opciones de desarrollador](https://developer.android.com/studio/debug/dev-options).
