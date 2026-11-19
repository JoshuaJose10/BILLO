# [RF13] El widget conserva el saldo al salir y queda vacío tras reiniciar

- Caso(s): CP-RF13-04; cruce CP-FINAL-PER-04.
- Historia / tarea: QA final integral.
- Severidad: Alta.
- Estado: Abierto.
- Responsable: Por asignar.
- Fecha de reporte: 2026-11-19.
- Fecha de corrección: Por acordar.

## Ambiente

- Rama `test/qa-final`; APK de commit `6281015ba698ec523bb4c6d99672c230788e0d75`.
- API `https://billo-api-v30t.onrender.com`.
- Samsung Galaxy A8 SM-A530F, Android 9; release 1.0.0, versionCode 2.
- SHA-256 `9b76fce17ebf481784fd8dfaa304bb65b3b9650ff709ab013279791f052f2f08`.

## Precondiciones

Cuenta QA A autenticada; dos widgets Billo ya agregados al launcher Samsung.
Ingresos 1500, variable 359.26, saldo 1140.74 antes de salir.

## Pasos para reproducir

1. Perfil → Cerrar sesión → confirmar CERRAR SESIÓN.
2. Volver al launcher y capturar sin quitar ni agregar widgets.
3. Reiniciar el teléfono con `adb reboot`.
4. Desbloquear, ir a la página de widgets y capturar antes de abrir Billo.
5. Abrir la aplicación y comprobar que no hay sesión de A.

## Resultado esperado

Los widgets limpian el saldo de A y muestran «Abre Billo», también después
del reinicio. Ningún dato financiero de la cuenta saliente queda expuesto.

## Resultado obtenido

La captura posterior al logout (03:27 local) todavía muestra saldo 1140.74 e
ingresos 1500 de A. No se afirma que permanezca indefinidamente: se reinició
después de capturar ese estado. Después del reinicio, con pantalla desbloqueada,
la página conserva dos nodos de widget Billo en la jerarquía Android pero ambos
quedan sin contenido visible, tampoco «Abre Billo» (03:34). Se esperaron otros
cuatro segundos y se volvió a capturar el mismo estado antes de abrir la app.
La apertura del APK muestra onboarding, sin sesión restaurada.
Al iniciar sesión como B, Inicio y ambos widgets pasan a saldo 775.00
(ingresos 1500, variable 725); no se observó mezcla con el importe de A.

## Evidencia

- [Saldo de A después del logout](../qa-final-evidencias/RF13-04-widget-logout.png).
- [Widgets sin contenido tras reinicio/desbloqueo](../qa-final-evidencias/RF13-04-widget-logout-reinicio.png).
- [Apertura posterior](../qa-final-evidencias/RF13-04-app-despues-logout-reinicio.png).
- [Inicio de B](../qa-final-evidencias/RF13-04-inicio-B.png).
- [Widget de B](../qa-final-evidencias/RF13-04-widget-B.png).
- [Bitácora de capturas](../qa-final-evidencias/bitacora-capturas.jsonl).

## Reprueba

- Commit corregido: Pendiente.
- Fecha y quién probó: Pendiente.
- Resultado: Pendiente.
- Evidencia: Pendiente.
