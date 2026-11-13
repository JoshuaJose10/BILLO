# Evidencias de HU-40 — Android real con Expo Go

Guardar las capturas y grabaciones del teléfono **en esta misma carpeta**:

`docs/hu40-evidencias/android-real/`

El [reporte, sección Android real](../../app-sprint2-reporte.md#10-android-real) contiene la ficha y las tablas de resultados. Esta guía y los nombres de archivo son una preparación; todavía no hay resultados de Android.

## Antes de capturar

1. En Ajustes del teléfono → Acerca del teléfono / Información del software, capturar **marca y modelo** como `dispositivo-modelo.png` y **versión de Android** como `dispositivo-android.png`. Si una pantalla contiene ambos datos, una sola captura sirve, anotando su nombre en la ficha. Recortar IMEI, número de serie y teléfono si aparecen.
2. Anotar quién prueba, fecha/hora, versión de Expo Go y URL efectiva de `EXPO_PUBLIC_API_URL`. Ejecutar `git rev-parse --short HEAD` en la PC y registrar el commit al iniciar las pruebas. Registrar por separado el commit del backend si se conoce.
3. Para API local: mantener PostgreSQL activo, ejecutar `npm run dev` desde `backend/` y comprobar `http://<IP-PC>:3000/health` desde el celular. Para Render, usar la URL de HU-52 documentada en el README raíz y comprobar `/health` antes de iniciar. No suponer que un despliegue remoto coincide con el commit local.
4. Desde `mobile/`, ejecutar `npm start -- --clear` y abrir el QR en Expo Go. Usar la misma Wi-Fi para la conexión LAN; si se usa túnel, también debe ser accesible la URL del backend desde el teléfono.
5. Usar cuentas de QA: A con datos, B para aislamiento y una nueva para estados vacíos. Entrar con una cuenta; el modo visitante no valida API ni persistencia.
6. Preparar datos por caso: los saldos de C y E son distintos. Restablecerlos o usar cuentas separadas. Para C, probar 150 → 800 → 1000 → más de 1000; corresponde a C4 → C5 → C8 → C6. Para E1 usar solo 500 en gastos y 300 en membresías; para E2 preparar 600/300/100 por categoría.

Capturar directamente desde Android; para gestos o secuencias, usar la grabación de pantalla del teléfono. Mantener visible lo necesario para identificar el caso. Guardar PNG para capturas y MP4 para videos; si el teléfono produce JPG, conservarlo y actualizar la extensión en el reporte. Evitar que aparezcan contraseñas o tokens.

## Capturas prioritarias

| Caso | Qué hacer y qué debe mostrar la evidencia | Archivos |
|---|---|---|
| D1 | Cartera → Suscripciones → Agregar. Netflix, costo 199, Mensual. Abrir el calendario Android, elegir hoy + 10 días y guardar. Capturar el selector con el día elegido y la fila guardada con costo, frecuencia y «Cobra en 10 días». Registrar la fecha concreta; si se prueba el 2026-11-11, elegir 2026-11-21. | `D1-selector.png`, `D1-guardada.png` |
| C2 | Intentar introducir -500 en un presupuesto y guardar. Mostrar cómo se intenta la entrada y el rechazo, además de comprobar que no se creó. Revisar la nota sobre el teclado numérico antes de asignar resultado. | `C2.mp4` o `C2-01.png` y `C2-02.png` |
| D6 | Intentar introducir «abc» en el costo de una membresía y guardar. Mostrar el intento, el rechazo y que no se creó. Revisar la nota sobre el teclado numérico. | `D6.mp4` o `D6-01.png` y `D6-02.png` |
| E6 | Capturar Reportes antes. Crear un gasto de 80.50 del mes actual, volver a Reportes; editar ese gasto a 100 y volver; eliminarlo y volver. Deben variar los totales +80.50, luego +100 respecto al inicio, y regresar al original. Mantener la app abierta, sin recargar Expo. | `E6-antes.png`, `E6-creado.png`, `E6-editado.png`, `E6-eliminado.png`; video opcional `E6.mp4` |
| F7 | Con API local: entrar, dejar Expo/Metro activo, detener solo el backend con Ctrl+C en su terminal e intentar cargar datos o guardar un gasto. Esperar el error (timeout del cliente: 15 s, HU-69), comprobar que la app sigue abierta; volver a encender la API y reintentar. Grabar la app y guardar también captura de la terminal que demuestre la detención. | `F7.mp4`, `F7-api-detenida.png` |
| F8 | En Nuevo gasto introducir monto/categoría y abrir **Nota** para mostrar el teclado del sistema. Capturar la pantalla completa; probar desplazarse y llegar a Guardar. Si primero hay que cerrar el panel de Nota, mostrar ese recorrido y comprobar si conserva el texto y permite guardar. Registrar la limitación si Guardar queda inaccesible. | `F8-teclado.png`, `F8.mp4` |
| D8 / BUG-01 | Crear `QA BUG-01`, 199 mensual, con fecha de hace 30 días. Capturar fecha elegida y resultado en Cartera (fila y encabezado). Ahora se espera un ciclo vigente por HU-51; comparar con [la ficha del bug](../../qa/bugs/BUG-01-cobro-recurrente.md). | `D8-fecha.png`, `D8-lista.png` |

### Entrada numérica: C2, D6 y B2

La versión actual usa `MontoGrande` con un **teclado numérico propio**, sin campo editable para pegar texto. Ese teclado no ofrece signo negativo ni letras. Esto afecta los pasos históricos C2 (-500), D6 (abc) y B2 (ochenta).

Grabar el intento y anotar exactamente lo observado. **No sustituir -500 por 500**, ni «abc» por cero, y declarar que se ejecutó el caso original. Si no hay forma de introducir el dato, registrar el caso como **Bloqueado: entrada no disponible en esta interfaz**, con evidencia, y conservar la decisión general Pendiente hasta acordar con el PO la adaptación del caso.

Se puede comprobar adicionalmente el rechazo del importe vacío/cero desde el teléfono, identificándolo como variante (por ejemplo `C2-variante-cero.png` y `D6-variante-cero.png`). La revisión del código o una petición de API con -500/abc son evidencia complementaria; por sí solas no completan el caso de Android real. Si el PO acepta que impedir la entrada cubre el resultado esperado, registrar su decisión, fecha y el paso adaptado antes de cerrar esos casos como Pasa.

### F7 y F3 cuando se usa Render

**F7 necesita controlar el backend que usa el teléfono.** Detener el backend de la PC no afecta a la API de Render. Activar modo avión comprueba F1, no demuestra servidor caído. Para F7, cambiar temporalmente `mobile/.env` a `http://<IP-PC>:3000`, reiniciar Expo con `npm start -- --clear`, autenticar una cuenta local y repetir el escenario con el backend local. Anotar en el reporte esta URL y el commit del backend usados para F7. Al terminar, restaurar la URL anterior y reiniciar Expo; las cuentas y datos de Render y de la base local son independientes.

**F3 requiere un token realmente vencido.** En el backend local, conservar el valor anterior de `JWT_EXPIRES_IN`, establecerlo temporalmente en `1m` y reiniciar la API. Iniciar una sesión nueva, esperar 2 minutos y provocar una petición autenticada cambiando de pantalla. Grabar el retorno a Login y el aviso. Restaurar el valor anterior y reiniciar la API al terminar. Usar datos de QA y no modificar el despliegue compartido para estas pruebas.

Para F1, cargar primero la app y el formulario, grabar el modo avión y el intento de guardar sin recargar Expo. Grabar F2 al recuperar la conexión y reintentar en esa misma sesión.

## Evidencia de los gestos

Grabar el dedo mediante «Mostrar toques» si el teléfono ofrece esa opción; no es obligatorio. Empezar con la fila cerrada, deslizar a la izquierda y esperar las acciones. Al terminar, comprobar que el scroll vertical no activa acciones y que al abrir otra fila se cierra la anterior.

| Archivo | Recorrido que debe verse |
|---|---|
| `G1.mp4` | Inicio: deslizar gasto → Editar → cambiar monto → guardar → ver el cambio. |
| `G2.mp4` | Movimientos: deslizar gasto → Eliminar → Cancelar (permanece) → repetir y confirmar (desaparece). |
| `G3.mp4` | Cartera → Presupuestos: deslizar → editar; después probar cancelar y confirmar la eliminación de un presupuesto de QA. |
| `G4.mp4` | Cartera → Suscripciones: deslizar → editar; después probar cancelar y confirmar la eliminación de una membresía de QA. |
| `G5.mp4` | Provocar el aviso del 80 % del presupuesto; deslizar el aviso hacia arriba antes de que se oculte solo (5 s) y volver a Cartera para comprobar que el consumo sigue registrado. |

## Resto de los flujos A–F

Repetir **todos** los casos de las secciones 3 y 4 del reporte, también los aprobados en navegador. Usar los nombres indicados en la tabla Android. Para una captura simple usar `A1.png`, `B1.png`, etc.; para varios pasos usar sufijos `-01`, `-02`. Los videos deben mostrar las secuencias donde una imagen fija no prueba el comportamiento.

- A1–A5: acceso correcto y mensajes de validación; evitar mostrar contraseñas durante el registro/login.
- B1–B6: datos del gasto, validación, filtros y antes/después de editar/eliminar. Para B2 se aplica la nota de entrada numérica.
- C1–C8: presupuesto, duplicado y alertas al 80 %, 100 % y al exceder. En C3, anotar el comportamiento actual: la pantalla puede abrir la edición del presupuesto existente en vez de mostrar el mensaje histórico.
- D1–D8: catálogo, costos, fechas, validaciones y total mensual antes/después.
- E1–E6: totales, porcentajes, estado vacío y cambio de mes. E3 sigue siendo necesario aunque F4 se ejecute.
- F1–F8: red, sesión, estados vacíos, aislamiento, temas, servidor y teclado. F4 requiere las cuatro pantallas principales vacías; F6 requiere esas pantallas tanto en claro como en oscuro.

Una captura puede servir para varios casos si acredita cada uno; enlazarla en las filas correspondientes. Registrar también el texto observado y los valores antes/después, especialmente para los casos de ausencia de avisos, aislamiento o consistencia.

## Cómo entregar resultados y reportar fallas

Al copiar las evidencias a esta carpeta, completar la ficha y las tablas del reporte. Si se informa por el chat, usar este formato para que se pueda incorporar:

```text
Modelo: ...
Android: ...
Expo Go: ...
Fecha/hora y quién probó: ...
Commit app / backend y URL API: ...
D1: Pasa | D1-selector.png, D1-guardada.png | fecha elegida: ...
C2: Bloqueado | C2.mp4 | el teclado no ofrece signo negativo
E6: Falla | E6-antes.png, E6-creado.png | total antes: ..., después: ...
```

Para **cada Falla**, copiar [la plantilla de bugs](../../plantilla-reporte-bug.md) en `docs/qa/bugs/BUG-02-<descripcion>.md`, usando el siguiente ID libre después de comprobar los existentes. Incluir caso, ambiente, datos exactos, pasos, esperado, obtenido y enlaces a evidencia. Enlazar la ficha desde la fila del caso. Si reaparece D8, actualizar BUG-01 en vez de duplicarlo.

Para cerrar: todos los A–F y gestos deben quedar ejecutados; los pendientes prioritarios necesitan Pasa/Falla y evidencia. Completar la reprueba de BUG-01, incorporar la URL de HU-51 en su ficha y registrar la revisión del PO. Mientras falten datos, evidencia o resolución de bloqueos, la decisión del reporte permanece **Pendiente**.
