# HU-79 — Guía de ejecución manual en Android

Usa el APK de **HU-53 en un Android físico**. No necesitas conectarlo por USB.
Los pasos y resultados esperados de los 12 casos están en el
[plan, sección 5.1](../../plan-de-pruebas.md#51-hu-79-moneda-voz-y-widget-en-apk-hu-53).
Anota lo observado en el [reporte](../hu79-reporte.md), aunque falle.
Por indicación del usuario el **2026-11-15**, toda evidencia manual se entrega
como **capturas de pantalla (SS) en PNG o JPG**, ordenadas por caso y paso.

Las 19 SS aportadas el 2026-11-15 ya están organizadas en carpetas
`CP-RF12-01/`, `CP-RF12-02/` y `CP-RF13-01/` a `CP-RF13-04/`.
El [anexo del reporte](../hu79-reporte.md#anexo--capturas-incorporadas)
las muestra con descripción; el [índice](indice-capturas.json) conserva los
nombres originales. RF11 tiene aprobación declarada sin SS. En CP-RF13-02 el
usuario aclaró que la fecha de cobro era posterior y aún no generaba deuda;
el total 0 es correcto para esa variante. El reporte registra los 12 casos
Pasa (reportados), sin bugs abiertos; conserva las capturas de la ejecución.

## Preparar teléfono y APK

1. Instala el APK de HU-53 identificado por el equipo. El enlace documentado
   está en [mobile/README.md](../../../mobile/README.md#apk-de-entrega-hu-53).
   Confirma que contiene las mejoras y es release; la versión sola no demuestra
   qué commit contiene. Si falta voz/widget, registra lo observado y confirma
   con el responsable si falta una dependencia en el build.
2. Guarda modelo/Android y nombre/versión del launcher; captura información de
   Billo con versión/versionCode. Omite IMEI, serie y datos personales.
3. Completa fecha/hora America/Mexico_City, ejecutor, enlace/build del APK,
   commit/SDK si el equipo los conoce y API del binario en el reporte.
4. Si tienes el archivo APK en Windows, calcula el hash (adapta la ruta):

   ```powershell
   Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\ruta\Billo-HU53.apk'
   ```

5. Prepara cuentas QA A y B, categorías Comida/Transporte y datos aislados.
   Captura mes y totales iniciales antes de cada caso. No compartas credenciales.
6. Comprueba la app sin Metro ni servidor de desarrollo. El widget después de
   reiniciar debe funcionar con el JavaScript incluido en el APK de release.

## Orden recomendado y evidencia

Empieza por **RF13**, por su riesgo y para obtener las capturas antes y después
del reinicio. Después ejecuta voz y moneda. No es obligatorio que
todos los casos pasen para compartir la evidencia.

Guarda capturas PNG/JPG en esta carpeta, o usa enlaces a esas imágenes accesibles
para QA/PO. Identifica caso, variante y orden de cada captura. Los nombres siguientes son sugeridos, no
archivos ya existentes. Añade fecha o `retest-01` en una reprueba y conserva
el resultado anterior.

| Caso | Qué debe verse / registrarse |
|---|---|
| CP-RF13-01 | Selector Widgets → Billo, widget agregado, mes/total e Inicio para comparar; toque del widget abre app. |
| CP-RF13-02 | Cinco variantes: gasto +80, edición a 95.50, borrado, suscripción +100 y borrado de suscripción. Captura total antes/después de cada una. Para suscripciones abre Inicio antes de volver al launcher. |
| CP-RF13-03 | Capturas del widget con mes/total antes del reinicio, Wi-Fi/datos apagados, widget después del reinicio antes de abrir Billo, tiempo de actividad del sistema si está disponible y app abierta al tocarlo. Completar la bitácora indicada abajo. |
| CP-RF13-04 | Logout → «Abre Billo»; reinicio y persistencia de ese estado; acceso de B e Inicio con total distinto y widget de B. |
| CP-RF12-01 | Capturas de escucha/transcripción si es visible, formulario 80/Comida antes de confirmar y gasto único después de confirmar. Anotar la frase pronunciada «ochenta pesos en comida» y el resultado observado; registrar que no se guardó automáticamente. |
| CP-RF12-02 | Tres intentos separados: «eh este pues», ruido y silencio; transcripción/aviso, campos conservados y posterior captura manual de 85. |
| CP-RF11-01 | Selección USD, respuesta de tasa con fecha, gasto original 10, equivalente y aumento correcto en Reportes; reapertura conserva datos. |
| CP-RF11-02 | Fuente QA caída con API disponible y sin cachés; respuesta 502, aviso y captura manual explícita de 80 MXN. |
| CP-RF11-03 | Suscripción de 10 USD, tasa y fecha, original/equivalente en lista/detalle, Reportes y reapertura. |
| CP-RF11-04 | Fuente QA caída sin cachés; respuesta 502, aviso y guardado explícito de suscripción por 99 MXN. |
| CP-RF11-05 | Tasa r cargada antes del fallo; 502 después, aviso de último tipo conocido y suscripción de 10 USD convertida con r. |
| CP-RF11-06 | Editar la suscripción de CP-RF11-03 a 199 MXN, sin original/tasa, total fijo corregido. |

Ejemplos: `CP-RF13-03-01-antes.png`, `CP-RF13-03-02-sin-red.png`,
`CP-RF13-03-03-despues.png`. Para cada variante captura el estado inicial,
el resultado y el error si aparece. Una misma SS puede apoyar varios pasos
si se indica cuáles. En voz, captura las transcripciones/avisos mientras estén
visibles; describe en el resultado real lo que solo pudiste observar al ejecutar.

## Cómo acreditar el reinicio del widget

Ejecuta el reinicio completo y conserva esta secuencia de SS:

1. `CP-RF13-03-01-antes.png`: launcher con widget, mes y total T.
2. `CP-RF13-03-02-sin-red.png`: ajustes rápidos con Wi-Fi y datos apagados.
3. Reinicia el teléfono completo, desbloquéalo y vuelve al launcher sin abrir Billo.
4. `CP-RF13-03-03-despues.png`: widget tras el reinicio, antes de abrir Billo,
   con el mismo mes y total T (o el fallo observado).
5. `CP-RF13-03-04-tiempo-actividad.png`: Ajustes → información/estado del teléfono
   → tiempo de actividad, si tu Android lo muestra; captúralo después de la SS
   del launcher. Si no existe esa opción, anótalo en la bitácora.
6. `CP-RF13-03-05-apertura.png`: vuelve al launcher, toca el widget y captura
   la app abierta o el error.

Completa en el resultado real: ejecutor, fecha/hora antes y después,
reinicio completo realizado, Wi-Fi/datos apagados, mes/total antes y después,
tiempo que tardó en dibujarse y confirmación de que no abriste Billo entre
reiniciar y capturar el launcher. Las SS documentan estados; la bitácora del
ejecutor documenta las acciones entre ellos. El tiempo de actividad apoya
el reinicio cuando está disponible. No presentar una captura aislada como
prueba de toda la secuencia ni marcar Pasa sin ejecutar los pasos.

Mantén Wi-Fi y datos apagados, no abras Billo antes de mostrar el widget y
conserva el mismo mes. Anota cuánto tarda en dibujarse. Si queda vacío o se
cierra al tocarlo, guarda la evidencia y registra Falla con bug. No lo quites,
no lo vuelvas a agregar ni abras Billo para «arreglarlo» antes de capturar el
estado tras el reinicio. Si falta ejecutar el reinicio o documentar la secuencia, deja ese caso
pendiente de evidencia; RF13 no queda aprobado.

## Cómo preparar la caída de la fuente de divisas

Estos casos requieren apoyo del responsable del backend o de un entorno QA
compatible con el APK. Puedes ejecutar los otros casos mientras se prepara.

1. Confirma la API incluida en el APK. El perfil release del repositorio
   apunta a la API en línea; modificar `backend/.env` o `mobile/.env` de tu
   computadora no cambia la API de un APK ya instalado.
2. En un **backend QA aislado**, mantener operativas autenticación y escrituras
   y hacer fallar solo la fuente de divisas. Por ejemplo, el responsable puede
   iniciar ese backend QA con `TIPO_CAMBIO_URL=http://127.0.0.1:1/no-disponible`
   (puerto confirmado sin servicio). Reiniciar ese backend limpia su caché de
   5 minutos. No aplicar esa configuración en la API compartida de producción.
3. Para CP-RF11-02/04, detener y volver a abrir el proceso de Billo antes de
   elegir USD; así no queda su tasa en memoria. No borrar datos ni desinstalar.
4. Para CP-RF11-05, cargar primero la tasa con la fuente operativa, registrar
   r/fecha y mantener vivo Billo. Después provocar el fallo y limpiar la caché
   del backend QA, conservando la del cliente.
5. Guardar SS de la evidencia HTTP **sanitizada de la consulta que hizo el APK**:
   fecha/hora, ruta, 502 y `FUENTE_NO_DISPONIBLE`, asociada al aviso en pantalla.
   El responsable puede capturarla en registros/proxy QA con la ruta, respuesta
   y hora visibles, además de la SS del aviso en el teléfono. No mostrar
   `Authorization`, tokens, contraseñas ni datos ajenos.
6. Restaurar la fuente QA y reiniciar el backend al terminar. Registrar que
   una consulta posterior devuelve 200 y una tasa válida.

Si solo puedes apagar internet del teléfono, registra esa observación como
prueba adicional de conectividad; no acredita la falla del proveedor.
Si no hay API QA compatible ni captura de la respuesta, marca esos casos
Bloqueado e indica qué falta. Una tasa guardada puede ocultar la caída de
fuente; un 200 de caché no es evidencia de 502.

## Registrar resultado y bugs

Por cada caso comparte o completa:

```text
Caso y variante:
Fecha/hora (America/Mexico_City):
Modelo/Android y build del APK:
Datos iniciales / tasa / mes / total, según aplique:
Resultado: Pasa / Falla / Bloqueado
Real: qué observaste y qué valores quedaron guardados
Evidencia: archivos PNG/JPG o enlaces a SS, en orden por paso/variante
Bug si Falla: ID/enlace, severidad y responsable acordado
Aviso si Falla: destinatario, fecha/hora local y enlace
Motivo y acción necesaria si Bloqueado:
```

Si falla, copia la [plantilla de bug](../../plantilla-reporte-bug.md) a
`docs/qa/bugs/HU79-BUG-nn.md`; un defecto por ficha y todos sus casos asociados.
Luis Dorian debe avisar al responsable **el mismo día** y registrar la
constancia. El reporte no envía mensajes automáticamente.

Al terminar, actualiza conteos y decisiones en el reporte y marca únicamente
los RF aprobados en la [lista de requisitos](../../lista-requisitos.md).
Faltando evidencia o la prueba del reinicio, deja el RF como no aprobado y
explica la razón. La tarea completa requiere aprobación de Luis Dorian y
visto bueno del PO; fecha final indicada: **domingo 15 de noviembre de 2026**.
