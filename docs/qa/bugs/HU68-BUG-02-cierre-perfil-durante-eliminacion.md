# HU68-BUG-02 — El perfil permite salir mientras se elimina la cuenta

- Caso(s): cierre del perfil durante `DELETE /auth/cuenta` pendiente.
- Historia / tarea: HU-68 — Eliminar la cuenta y todos los datos.
- Severidad propuesta: **Media**; permite abandonar una operación destructiva en curso y perder el mensaje de error si la petición falla.
- Estado: Abierto; identificado por inspección de código. Reproducción en dispositivo pendiente. Alta en ClickUp pendiente.
- Responsable: Por asignar.
- Fecha de reporte: 2026-11-12, America/Mexico_City.
- Fecha de corrección: Por acordar.

## Ambiente

- Rama revisada: `feature/eliminar-cuenta`, commit `370ef0b`.
- Billo mobile 1.0.0, Expo SDK 58, React Native.
- Revisión estática en Windows. No se ejecutó este caso en un teléfono o emulador; modelo, sistema operativo y versión del cliente por registrar en la reproducción.

## Precondiciones

Cuenta descartable autenticada en la app, API de QA accesible y contraseña conocida. Retardar la respuesta de `DELETE /auth/cuenta` mediante una herramienta de red o un doble de prueba, con tiempo suficiente para tocar el fondo exterior antes de que llegue la respuesta. Para la variante de error, hacer que la petición responda `500` con el formato de errores de la API y sin eliminar datos.

No simular el fallo devolviendo `500` después de una eliminación real: debe tratarse de un rechazo previo al borrado o de una transacción revertida.

## Pasos para reproducir

1. Abrir Perfil → «Eliminar mi cuenta».
2. Introducir la contraseña correcta y tocar «Eliminar definitivamente».
3. Mientras aparece el indicador de carga y la respuesta sigue pendiente, tocar el fondo exterior de la hoja de Perfil, por encima de su borde superior. Este fondo pertenece a `HojaInferior`, no al panel interno de confirmación.
4. Comprobar si se cierra Perfil y se vuelve a la pantalla anterior antes de conocer el resultado.
5. Liberar la respuesta retenida. Repetir con éxito y con el error controlado `500` para observar ambos resultados.

## Resultado esperado

Mientras la petición esté pendiente, las vías de salida del perfil deben estar bloqueadas. Si falla, el perfil debe permanecer abierto, presentar el error y volver a permitir reintentar o cancelar. Si termina correctamente, debe cerrarse la sesión y mostrarse Login.

Cancelar o cerrar el panel antes de enviar la petición debe seguir funcionando sin borrar datos. Una vez enviada, cerrar una vista no garantiza cancelar la transacción del servidor.

## Resultado obtenido por inspección

`PerfilScreen` activa `eliminando` y bloquea el botón Cancelar y el cierre del panel interno, pero no pasa `bloqueada={eliminando}` a `HojaInferior`. Esa propiedad vale `false` por defecto, por lo que el toque sobre el fondo exterior sigue llamando a `cerrar()`, que termina en `navigation.goBack()`.

La petición iniciada continúa aunque la pantalla se desmonte. Si falla después de salir, el manejador intenta guardar el mensaje en el estado de una pantalla que ya no se muestra. Si tiene éxito, continúa llamando a `cerrarSesion()`.

Este comportamiento se deduce del flujo de código; aún no hay captura ni ejecución del caso en dispositivo.

## Evidencia

- [PerfilScreen](../../../mobile/src/screens/PerfilScreen.js): `handleEliminarCuenta`, uso de `HojaInferior` y guardia `if (!eliminando)` del panel interno.
- [HojaInferior](../../../mobile/src/components/HojaInferior.js): propiedad `bloqueada = false`, función `cerrarPorUsuario` y fondo exterior que la invoca.
- [NuevoGastoScreen](../../../mobile/src/screens/NuevoGastoScreen.js): ejemplo existente del uso de `bloqueada={ocupado}` durante una operación pendiente.
- Evidencia visual y reproducción con respuesta retardada: Pendientes.

## Corrección sugerida y criterios de cierre

Conectar `bloqueada={eliminando}` a `HojaInferior` y comprobar todas las vías de salida de la pantalla, incluido Atrás del sistema cuando aplique. Verificar con una respuesta retardada que no se pueda salir durante la petición, que un error permanezca visible y habilite reintentar o cancelar, y que el éxito redirija a Login. Conservar la cancelación previa al envío sin efectos en la base de datos.

## Reprueba

- Commit corregido: Pendiente.
- Fecha y quién probó: Pendiente.
- Modelo / sistema operativo / cliente / API: Pendiente.
- Resultado: Pendiente.
- Evidencia: Pendiente.
