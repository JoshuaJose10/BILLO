# QA: HU-47 — Permiso y registro del token de notificaciones (RF7)

Fecha: 2026-11-09. Criterio de aceptación: en un Android real llega un aviso de
prueba; sin permiso no hay errores.

## Qué hace la app

- Después de iniciar sesión (o al abrir la app con la sesión guardada) pide el
  permiso de notificaciones, obtiene el token de Expo y lo manda a
  `POST /notificaciones/token`. Una vez por sesión; si entra otro usuario, se
  vuelve a registrar.
- **Un token pertenece a una sola cuenta.** Si otra cuenta ya lo tenía (mismo
  teléfono), el backend se lo quita al registrarlo la nueva (migración 013,
  índice único).
- **Al cerrar sesión** la app espera el registro en curso (máx. ~3 s), llama a
  `DELETE /notificaciones/token` con la sesión todavía vigente (máx. ~3 s) y
  cierra la sesión pase lo que pase: sin red o con el backend apagado el cierre
  tarda como mucho ~6 s y no muestra errores. Un registro que siga pendiente de
  una sesión ya cerrada o cambiada se descarta.
- En Android crea antes el canal `default` («Avisos de cobro», importancia alta):
  Android 13+ no muestra el diálogo de permiso sin canal.
- **El permiso se pide solo la primera vez** (estado `undetermined`). Si el
  usuario lo niega no se vuelve a preguntar en ninguna sesión, aunque Android lo
  permitiría; se activa desde Ajustes. No se muestra ningún mensaje. Lo mismo en
  Expo Go, simulador, sin Firebase o con error del backend: la app funciona igual.
- Con la app abierta el aviso se muestra como banner con sonido.
- Al tocar un aviso se abre **Cartera › Suscripciones** (también con la app
  cerrada; si no hay sesión, después de entrar). Payload esperado del backend:
  `data: { "tipo": "cobro", "membresia_id": 4 }`. Sin `data` también abre
  Suscripciones; un `tipo` distinto de `cobro` no navega.

Código: `mobile/src/services/tokenPush.js` (Expo, API y vínculo token–sesión),
`mobile/src/services/notificaciones.js` (hooks), `mobile/src/context/AuthContext.js`
(cierre de sesión) y `mobile/src/utils/notificaciones.js` (decisiones, con pruebas
en `npm test`). Backend: `backend/src/controllers/notificaciones.controller.js`,
con pruebas en `backend/test/suites/notificaciones.cjs`.

## Android real con development build

El módulo nativo es nuevo: el APK de development build anterior **no sirve**, hay
que generar uno.

1. **Firebase** (quien administre el proyecto): en la consola de Firebase, agregar
   una app Android con el paquete `com.billo.app` y descargar
   `google-services.json`. Colocarlo en `mobile/` y agregar en `mobile/app.json`:
   ```json
   "android": { "googleServicesFile": "./google-services.json", ... }
   ```
   Este archivo todavía no está en el repo (pendiente de decidir si se versiona).
2. **Llave FCM V1 en EAS:** en Firebase › Configuración del proyecto › Cuentas de
   servicio › «Generar nueva clave privada» (JSON). Luego, desde `mobile/`:
   ```bash
   npx.cmd eas-cli credentials
   ```
   Android › development › Google Service Account › «Manage your Google Service
   Account Key for Push Notifications (FCM V1)» › subir el JSON. No subir ese
   JSON al repo.
3. **Build:**
   ```bash
   npx.cmd eas-cli build --profile development --platform android
   ```
4. **Instalar** el APK, `npm run start:dev-client`, iniciar sesión y **aceptar** el
   permiso. En la consola de Metro no debe aparecer `[notificaciones]`.
5. **Verificar el token en la BD:**
   ```sql
   SELECT id, email, expo_push_token FROM usuarios WHERE email = 'correo@prueba.com';
   ```
   Debe verse `ExponentPushToken[...]`.
6. **Enviar un aviso de prueba**, con la herramienta https://expo.dev/notifications
   (pegar el token, título, mensaje y en *Data* `{"tipo":"cobro"}`) o con curl:
   ```bash
   curl -H "Content-Type: application/json" -X POST https://exp.host/--/api/v2/push/send -d '{
     "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
     "title": "Cobro próximo",
     "body": "Netflix se cobra en 3 días: $219.00",
     "channelId": "default",
     "data": { "tipo": "cobro", "membresia_id": 1 }
   }'
   ```
   En PowerShell usar `curl.exe` y guardar el cuerpo en un archivo (`-d @aviso.json`).

### Casos a revisar

| # | Caso | Resultado esperado |
|---|---|---|
| 1 | App en segundo plano o cerrada, enviar aviso | Llega a la bandeja con el ícono de Billo |
| 2 | App abierta, enviar aviso | Banner con sonido |
| 3 | Tocar el aviso (abierta, en segundo plano y cerrada) | Abre Cartera › Suscripciones |
| 4 | Tocar el aviso sin sesión | Después de entrar, abre Cartera › Suscripciones |
| 5 | Negar el permiso | Sin mensajes ni errores; la BD no cambia |
| 6 | Negar el permiso, cerrar sesión y volver a entrar (dos veces) | No vuelve a aparecer el diálogo |
| 7 | Permiso concedido, cerrar sesión y volver a entrar | No aparece el diálogo; el token se registra |
| 8 | Cerrar sesión | En la BD `expo_push_token` del usuario queda `NULL`; un aviso enviado a ese usuario ya no llega |
| 9 | Cerrar sesión con el backend apagado o sin red | La sesión se cierra (en ~6 s como máximo) sin mensajes de error |
| 10 | Usuario A entra, cierra sesión; entra B en el mismo teléfono | El token queda solo en B (consulta abajo); un aviso para A no llega |
| 11 | Cerrar sesión justo después de entrar (antes de que termine el registro) | La sesión se cierra; A no queda con el token |
| 12 | Backend apagado al iniciar sesión | El login no se bloquea ni muestra error por esto |
| 13 | Ajustes › Apps › Billo › Notificaciones | Aparece el canal «Avisos de cobro» |

Consulta para los casos 8, 10 y 11 (ningún token debe aparecer en dos cuentas):

```sql
SELECT id, email, expo_push_token FROM usuarios WHERE expo_push_token IS NOT NULL;
```

## Qué se puede probar en Expo Go

Expo Go en Android no soporta push desde SDK 53, así que ahí solo se valida que
**no truene**: la app abre, el login funciona y no aparece el diálogo de permiso.
En desarrollo Metro muestra un aviso amarillo de `expo-notifications` («not fully
supported in Expo Go»); es esperado y no lo ve el usuario final.

En **iPhone con Expo Go** sí puede aparecer el diálogo de permiso y obtenerse un
token. Revisar:

- Aceptar o negar el permiso no muestra errores y la app sigue normal.
- Si lo acepta, el token se guarda en la BD (paso 5). Un aviso enviado a ese
  token puede llegar a Expo Go, pero no es la prueba de aceptación: la
  aceptación es en Android real con development build.
- Negar y volver a entrar no vuelve a preguntar.
- Cerrar sesión deja `expo_push_token` en `NULL`; entrar con otra cuenta lo mueve
  a esa cuenta (casos 8 y 10).

En simulador o emulador no se pide permiso ni se registra token.
