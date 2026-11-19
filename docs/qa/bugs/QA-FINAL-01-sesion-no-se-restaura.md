# [RF1 / Perfil] La sesión autenticada no se restaura al relanzar el APK

- Caso(s): CP-FINAL-PER-05; observado durante CP-RF11-01/03 y sus pasos de reapertura.
- Historia / tarea: QA final integral.
- Severidad: Alta.
- Estado: Abierto.
- Responsable: Por asignar.
- Fecha de reporte: 2026-11-19.
- Fecha de corrección: Por acordar.

## Ambiente

- Rama de QA: `test/qa-final`; APK originado en `6281015ba698ec523bb4c6d99672c230788e0d75`.
- API: `https://billo-api-v30t.onrender.com`.
- Samsung Galaxy A8 SM-A530F, Android 9.
- APK release 1.0.0, versionCode 2, `com.billo.app`.
- SHA-256: `9b76fce17ebf481784fd8dfaa304bb65b3b9650ff709ab013279791f052f2f08`.

## Precondiciones

Cuenta desechable QA Final A autenticada. Gasto y suscripción en USD guardados
correctamente. No cerrar sesión, borrar datos ni reinstalar el APK.

## Pasos para reproducir

1. Iniciar sesión y guardar un gasto y una suscripción.
2. Comprobar que los datos aparecen en la aplicación.
3. Cerrar el proceso con `adb shell am force-stop com.billo.app`.
4. Abrir el APK desde su actividad de lanzamiento.
5. Observar el onboarding y pulsar Omitir.
6. Iniciar sesión de nuevo con la misma cuenta.

## Resultado esperado

Al relanzar se recupera la sesión guardada y se muestran los datos de la cuenta.
El onboarding previamente omitido/completado no vuelve a aparecer.

## Resultado obtenido

Se muestra otra vez el onboarding y, al omitirlo, la pantalla «Esto es Billo» con
Crear cuenta / Ya tengo cuenta. La cuenta necesita autenticarse nuevamente.
Los registros permanecen en el servidor y vuelven a verse después del login:
no se observó pérdida de gastos ni de suscripciones.

Pista para investigación, sin atribuir causa confirmada: en `AuthContext.js`, la
restauración llama `[CLAVE_TOKEN, CLAVE_USUARIO, CLAVE_ONBOARDING].map(almacen.leer)`.
Revisar los argumentos adicionales que `map` pasa a la función de SecureStore
y la excepción absorbida por el `catch` de restauración.

## Evidencia

- [Suscripción guardada antes de cerrar](../qa-final-evidencias/RF11-03-suscripcion-guardada.png).
- [Onboarding al relanzar](../qa-final-evidencias/RF11-01-03-reapertura.png).
- [Entrada sin sesión después de Omitir](../qa-final-evidencias/RF11-01-03-despues-omitir.png).
- [Datos recuperados al iniciar sesión nuevamente](../qa-final-evidencias/RF1-02-datos-restaurados-login.png).
- [Persistencia del gasto](../qa-final-evidencias/RF11-01-persistencia.json).
- [Persistencia de la suscripción](../qa-final-evidencias/RF11-03-persistencia.json).

## Reprueba

- Commit corregido: Pendiente.
- Fecha y quién probó: Pendiente.
- Resultado: Pendiente.
- Evidencia: Pendiente.
