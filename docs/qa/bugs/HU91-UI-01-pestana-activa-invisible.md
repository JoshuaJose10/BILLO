# [UI] La pestaña activa pierde el icono y el texto en la barra inferior

- Caso(s): CP-HU91-EX-01, exploratorio durante CP-HU91-09/10.
- Historia / tarea: HU-91, QA de categorías por usuario; hallazgo general de navegación.
- Severidad: Baja.
- Estado: Abierto.
- Responsable: Por asignar.
- Fecha de reporte: 2026-11-19.
- Fecha de corrección: Por acordar.

## Ambiente

- Rama y commit: `develop`, `6281015ba698ec523bb4c6d99672c230788e0d75`.
- API / ambiente de pruebas: `https://billo-api-v30t.onrender.com`; también ocurre con datos locales del visitante.
- Celular: Samsung Galaxy A8, SM-A530F, Android 9, 1080 × 2220.
- App: APK de release `com.billo.app`, 1.0.0, versionCode 2, SDK 58.
- SHA-256: `9b76fce17ebf481784fd8dfaa304bb65b3b9650ff709ab013279791f052f2f08`.

## Precondiciones

APK instalado y pantalla principal accesible. No se requieren credenciales:
el flujo mínimo usa «Explorar sin cuenta». Tema Automático resuelto a claro en
el dispositivo de prueba. También se observó en Oscuro con una cuenta QA.

## Pasos para reproducir

1. Abrir Billo y seleccionar «Explorar sin cuenta».
2. Tocar Movimientos y esperar a que termine la transición.
3. Tocar Cartera y esperar al menos dos segundos.
4. Tocar Inicio y esperar al menos dos segundos.
5. Observar la cápsula de la pestaña seleccionada en la barra inferior.
6. Como variante, con una cuenta QA seleccionar Tema Oscuro desde Perfil y
   observar Inicio después de volver o registrar un gasto.

## Resultado esperado

La pestaña activa se identifica visualmente por su cápsula, icono y etiqueta
legibles. Los iconos de las pestañas inactivas también permanecen visibles.

## Resultado obtenido

La cápsula de la pestaña activa aparece vacía. En tema claro se observa negra,
sin icono ni texto visibles; en oscuro se observa blanca, también vacía.
Al cambiar de sección el defecto sigue a la pestaña seleccionada. El título de
la pantalla cambia correctamente y los iconos inactivos sí se dibujan.

La navegación continúa funcionando y no se observó pérdida de datos. La causa
no se ha aislado y no se atribuye a contraste, animación o versión de Android
sin una investigación adicional. La jerarquía de accesibilidad sí contiene
los nombres de las pestañas; el defecto reportado es su presentación visual.

## Evidencia

- [Movimientos, tema claro, visitante](../hu91-evidencias/35-visitante-predefinidas.png).
- [Cartera, tema claro, visitante, después de la espera](../hu91-evidencias/37-navbar-cartera-claro.png).
- [Inicio, tema claro, visitante, después de la espera](../hu91-evidencias/38-navbar-inicio-claro.png).
- [Inicio, tema oscuro, cuenta QA B](../hu91-evidencias/34-propia-alta-gasto-guardado.png).
- [Lectura de elementos de accesibilidad en visitante](../hu91-evidencias/visitante-ui.json).

## Reprueba

- Commit corregido: Pendiente.
- Fecha y quién probó: Pendiente.
- Resultado: Pendiente.
- Evidencia: Pendiente.
