# QA: HU-65 — Pantallas de recuperar contraseña

Fecha: 2026-11-11. Backend: HU-64, contrato v1.3 (`POST /auth/olvide-contrasena` y
`POST /auth/restablecer-contrasena`). El «token» del contrato es un **código de 6 dígitos**
que llega por correo; no hay enlace ni deep link.

## Flujo en la app

1. **Login** → enlace «¿Olvidaste tu contraseña?» debajo del campo de contraseña. Abre
   **Recupera tu cuenta** con el correo que ya estuviera escrito.
2. **Recupera tu cuenta**: correo + «Enviar código». Con 200 (exista o no la cuenta) pasa a
   **Nueva contraseña**, cuyo subtítulo dice «Si _correo_ está registrado, te enviamos un
   código de 6 dígitos. Vence en 30 minutos.». «¿La recordaste? Entrar» regresa a Login con
   el correo.
3. **Nueva contraseña**: código en 6 casillas, nueva contraseña (con la pista de fuerza del
   registro) y confirmación. «Cambiar contraseña».
   - 200 → regresa a Login con el correo precargado y el aviso «Contraseña actualizada.
     Inicia sesión con la nueva.». **No inicia sesión sola.**
   - `TOKEN_INVALIDO` → «El código no es válido o ya venció» bajo las casillas (borde rojo,
     sacudida y vibración) y botón «Pedir otro código», que vuelve a Recupera tu cuenta con
     el correo.
   - «¿No te llegó? Podrás reenviarlo en 0:59…» cuenta 60 s; al llegar a 0 aparece
     «Reenviar código». Reenviar borra el código escrito y reinicia la cuenta.

El backend permite **3 solicitudes por correo cada 15 min** (en memoria; se reinicia al
reiniciar el servidor). La primera más 2 reenvíos funcionan; la 4.ª muestra «Ya pediste
varios códigos; espera unos minutos.».

## Casos manuales en el teléfono

| # | Caso | Pasos | Esperado |
|---|------|-------|----------|
| 1 | Precarga desde Login | Escribir correo en Login → «¿Olvidaste tu contraseña?» | El correo ya aparece en Recupera tu cuenta |
| 2 | Correo vacío / inválido | «Enviar código» sin correo, luego con `ana@correo` | «Ingresa tu correo» / «Ingresa un correo válido» bajo el campo; no hay petición |
| 3 | Correo no registrado | Enviar con un correo que no existe | Pasa a Nueva contraseña con el mismo mensaje genérico (no revela si existe) |
| 4 | Código correcto | Escribir el código del correo + contraseña válida dos veces | Login con el correo precargado y aviso «Contraseña actualizada»; entrar con la nueva funciona y la vieja no |
| 5 | Código incorrecto | `000000` | «El código no es válido o ya venció», sacudida + vibración, botón «Pedir otro código» |
| 6 | Código usado dos veces | Repetir el caso 4 con el mismo código | Igual que el caso 5 |
| 7 | Código vencido | Esperar más de 30 min | Igual que el caso 5 |
| 8 | Código incompleto | 5 dígitos y «Cambiar contraseña» | «Escribe los 6 dígitos del código»; no hay petición |
| 9 | Contraseña corta | 7 caracteres | «La contraseña debe tener al menos 8 caracteres» bajo el campo |
| 10 | No coinciden | Confirmación distinta | «Las contraseñas no coinciden» bajo la confirmación |
| 11 | Pegar código | Copiar «482 910» del correo y pegar (mantener presionadas las casillas) | Quedan los 6 dígitos y el foco pasa a la contraseña |
| 12 | Autocompletar | iOS: el teclado sugiere el código del correo (Mail); Android: sugerencia de autocompletado si el sistema la ofrece | Se llenan las 6 casillas |
| 13 | Reenviar | Esperar la cuenta a 0 y tocar «Reenviar código» | Spinner de texto «Enviando código…», luego cuenta de 60 s de nuevo; el lector anuncia «Te enviamos un código nuevo» |
| 14 | Límite (429) | Pedir 4 códigos del mismo correo en < 15 min | «Ya pediste varios códigos; espera unos minutos.» |
| 15 | Sin red | Apagar wifi y enviar | «No se pudo conectar con el servidor…» (patrón de la app) |
| 16 | Doble toque | Tocar «Enviar código» / «Cambiar contraseña» rápido varias veces | Una sola petición; botones bloqueados mientras se envía |
| 17 | Reducir movimiento | Activarlo en el sistema y repetir el caso 5 | Sin sacudida; sí borde rojo y vibración |
| 18 | Temas | Repetir 1–5 en claro y oscuro | Casilla activa con borde acento, error con borde `alertaTexto`, textos legibles |
| 19 | Lector de pantalla | VoiceOver / TalkBack en Nueva contraseña | El campo se anuncia «Código, 6 dígitos»; cada error se anuncia al aparecer; las casillas no se leen una por una |
| 20 | Modo visitante (HU-50) | «Explorar sin cuenta» → «Crear cuenta»/salir → Login → «¿Olvidaste tu contraseña?» | El flujo funciona (al salir del modo visitante la guardia de red se apaga) |

## Prueba contra el backend local (2026-11-11)

Con el servicio de la app (`mobile/src/services/auth.js`) contra `node src/index.js`.
Sin `BREVO_API_KEY` el backend no envía el correo, así que la llegada del correo se simuló
fijando en `usuarios.reset_token_hash` el SHA-256 de un código conocido para usuarios de
prueba (`qa-hu65-*@billo.test`, borrados al terminar). Antes hubo que aplicar las
migraciones pendientes de la base local (`npm run migrate`: 012, 013 y 014).

| Caso | Resultado |
|------|-----------|
| Solicitar código (registrado / no registrado) | 200 `{ enviado: true }` en ambos |
| Correo inválido | 400 `EMAIL_INVALIDO` |
| Código incorrecto | 400 `TOKEN_INVALIDO` |
| Contraseña corta con código correcto | 400 `PASSWORD_MUY_CORTA` (no consume el código) |
| Código correcto de otra cuenta (`email` distinto) | 400 `TOKEN_INVALIDO` |
| Código correcto | 200 `{ restablecida: true }`; login con la nueva 200, con la vieja 401 |
| Mismo código otra vez | 400 `TOKEN_INVALIDO` |
| Código vencido | 400 `TOKEN_INVALIDO` |
| 6 solicitudes seguidas | 200, 200, 200, 429, 429, 429 (`DEMASIADAS_SOLICITUDES`) |

## Verificación automática

`npm test` (332 pruebas, incluye `utils/recuperacion`, `utils/validacion` y
`services/auth`), `npm run lint`, `npm run verificar:temas`, `npm run check:sdk`,
`npm run doctor` (20/20) y `npm run test:bundle`: todo en verde.
