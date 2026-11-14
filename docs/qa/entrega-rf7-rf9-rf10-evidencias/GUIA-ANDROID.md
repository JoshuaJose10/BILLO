# Guía para guardar evidencias del APK HU-53

Guarda capturas y grabaciones en esta misma carpeta:

```text
docs/qa/entrega-rf7-rf9-rf10-evidencias/
```

Usa capturas de pantalla del teléfono (`.png` o `.jpg`); para navegación,
acciones consecutivas o persistencia, una grabación de pantalla (`.mp4`) ayuda
a mostrar el flujo completo. Si hay varios archivos de un caso, usa sufijos:

```text
CP-RF10-04-01-sin-red.png
CP-RF10-04-02-inicio.png
CP-RF10-04-03-reportes.png
CP-RF10-05-registro-persistencia.mp4
```

No reemplaces los archivos `.tap` ni los JSON de la ejecución anterior. En una
reprueba añade `-retest-01` o la fecha al nombre y conserva la evidencia inicial.
Las fotos muestran lo que ocurrió, aunque haya fallado; no es necesario que
todos los casos pasen para registrar su resultado.

## Antes de empezar

1. Usar un **Android físico con el APK de HU-53** identificado en [mobile/README.md](../../../mobile/README.md). Expo Go o un navegador no sustituyen esa ejecución.
2. Guardar `00-dispositivo.png`: Ajustes → Acerca del teléfono, con modelo y versión de Android. Recortar IMEI, número de serie y datos personales.
3. Guardar `00-app.png`: información de la app instalada con su versión. Registrar también el enlace/build del APK usado; la versión por sí sola no identifica el build.
4. Anotar nombre de quien prueba, fecha/hora local, modelo, Android y versión del APK en la ficha del [reporte](../entrega-rf7-rf9-rf10-reporte.md). Tener el teléfono disponible no demuestra que los casos ya se ejecutaron.
5. Usar cuentas y datos de QA. Para RF9 hacen falta una cuenta normal y una admin; RF7 requiere preparar el token y ejecutar el proceso de avisos en un ambiente controlado.

Los pasos completos y los saldos iniciales de cada caso están en el
[plan de pruebas](../../plan-de-pruebas.md). Las tablas siguientes indican qué
capturar; no sustituyen sus pasos. No mostrar contraseñas ni tokens.

## RF10 — empezar por modo visitante

| Caso / prefijo del archivo | Qué mostrar en las capturas o el video |
|---|---|
| `CP-RF10-03` | Desde Login, cómo encuentras «Explorar sin cuenta» y entras en máximo 2 toques. Grabar desde antes de tocar el botón. |
| `CP-RF10-01` | Inicio, Movimientos, Cartera y Reportes en visitante, con sus datos de ejemplo visibles. |
| `CP-RF10-02` | Intento de crear gasto; invitación a crear cuenta; «Seguir explorando» y datos intactos. Repetir las variantes de crear/editar/eliminar gastos, presupuestos y membresías del plan; nombrar cada variante. |
| `CP-RF10-04` | Wi-Fi y datos móviles apagados (modo avión con Wi-Fi apagado sirve), app arrancando desde cerrada, entrada a visitante y navegación con datos de ejemplo. Capturar también cambios de mes/categoría. |
| `CP-RF10-05` | Restablecer red; desde visitante intentar guardar → Crear cuenta → registro de cuenta nueva → pantallas sin datos demo → gasto real de $80.50 → cerrar sesión y reingresar → gasto conservado. Evitar grabar la contraseña. |

La grabación sin red muestra el comportamiento visible. La comprobación
estricta de ausencia de tráfico de Billo requiere además registro de red; si no
se dispone de él, anotar que esa aserción sigue pendiente.

## RF9 — administración del catálogo

| Caso / prefijo del archivo | Qué mostrar en las capturas o el video |
|---|---|
| `CP-RF9-01` | Como admin, buscar el alta de categorías e intentar agregar «Mascotas». Si solo hay servicios, mostrar esa pantalla y registrar que no se puede completar el caso. El defecto local ya tiene ficha ENT-RF9-01; no confundir categoría con servicio. |
| `CP-RF9-02` | Perfil de usuario normal y ausencia/rechazo de acceso a administración. Las peticiones POST/PUT/DELETE deben verificarse aparte: ver una opción oculta no prueba un 403 del backend. |
| `CP-RF9-03` | Como admin, crear servicio «QA Entrega» a 99, editarlo a 109; como usuario normal, comprobar el servicio actualizado al agregar una suscripción. Como admin, eliminarlo sin membresías asociadas y comprobar que desaparece al recargar. |
| `CP-RF9-04` | Crear una membresía que use un servicio QA; como admin intentar borrar ese servicio, mostrar el mensaje de rechazo y volver a comprobar que servicio, membresía y totales se conservan. |

Adjuntar también respuestas HTTP sanitizadas de permisos (403), operaciones
admin (201/200) y servicio en uso (409 `SERVICIO_EN_USO`), como exige el plan.
No modificar ni eliminar servicios que otras personas usan para sus pruebas.

## RF7 — avisos de cobro

Crear una membresía con fecha próxima **no obliga al servidor a ejecutar el
proceso de avisos en ese instante**. Coordinar su ejecución controlada; no
cambiar el reloj del teléfono. Registrar fecha de referencia D y fechas de
cobro absolutas. El caso de repetición usa dos ejecuciones con la misma D y sin
borrar la marca de notificación entre ellas.

| Caso / prefijo del archivo | Qué mostrar y qué adjuntar |
|---|---|
| `CP-RF7-01` | Membresía con cobro a D+3 y notificación recibida en la bandeja con el nombre y datos del cobro; resumen del proceso y marca en BD. |
| `CP-RF7-02` | Membresía con cobro a D+10; resumen del proceso con cero envíos y marca sin cambios. Una foto de la bandeja vacía no demuestra por sí sola que no se envió. |
| `CP-RF7-03` | Eliminación de la membresía antes del proceso; ausencia en BD y resumen sin envío para esa membresía. |
| `CP-RF7-04` | Membresía a D+2; aviso con nombre, 2 días y monto; tocarlo y comprobar Cartera → Suscripciones. Guardar video y resumen/marca del proceso. |
| `CP-RF7-05` | Evidencia del primer aviso y segunda ejecución del mismo día sin otro envío; resúmenes de ambas ejecuciones y marca conservada. |
| `CP-RF7-06` | Cuenta A sin token push usa la app sin fallo; cuenta de control B con token recibe su aviso. Adjuntar estado de tokens como presente/ausente (sin valores), marcas y resumen del proceso que omite A y continúa con B. |

Los registros del proceso y la BD pueden guardarse como `.txt` o `.json` con el
mismo prefijo del caso. Si no se puede preparar el token, ejecutar el proceso
o revisar sus registros, anotar esa dependencia como pendiente/bloqueada.

## Regresión RF1–RF6 y RF8

Usar un archivo o secuencia con **el ID de cada caso**, conservando los datos
iniciales y resultados visibles indicados en el plan. No mezclar los saldos de
casos independientes; preparar/restablecer los datos entre pruebas.

| Casos / prefijos | Qué mostrar |
|---|---|
| `CP-RF1-01` a `CP-RF1-04` | Registro y entrada a Inicio; login; rechazo de correo duplicado; rechazo de contraseña incorrecta. |
| `CP-RF2-01` a `CP-RF2-03` | Gasto de $80.50 con categoría/fecha/método y aparición en lista; rechazo de monto inválido; rechazo de categoría ausente. Si el teclado impide escribir texto, documentarlo y verificar el negativo por API, sin inventar una captura. |
| `CP-RF3-01` y `CP-RF3-02` | Presupuesto Comida de $2000 guardado; rechazo de -$500. |
| `CP-RF4-01` a `CP-RF4-07` | Con límite de $1000: alerta al total $800, excedido a $1050, sin alerta a $150; límites exactos de $799.90, $800, $1000 y $1000.10 con su estado. Para ausencia de aviso, grabar desde Guardar hasta la pantalla final. |
| `CP-RF5-01` a `CP-RF5-04` | Alta Netflix $199 mensual a 10 días, edición a $219 y eliminación; rechazo de nombre vacío y costo inválido. |
| `CP-RF6-01` y `CP-RF6-02` | Resumen con variable $500, fijo $300, total $800; cuenta nueva sin movimientos con los tres en cero. |
| `CP-RF8-01` y `CP-RF8-02` | Gráfica con categorías 600/300/100 y proporciones 60/30/10; estado sin datos con cuenta nueva. |

## Después de cada caso

Actualizar su fila del [reporte](../entrega-rf7-rf9-rf10-reporte.md): resultado
**Pasa/Falla**, fecha, ejecutor y enlaces a los archivos reales. Un caso no
ejecutado o con dependencias sin resolver sigue pendiente/bloqueado. Ejemplo
del formato del enlace (usar solo tras guardar el archivo):

```markdown
[Captura](entrega-rf7-rf9-rf10-evidencias/CP-RF10-04-01-sin-red.png)
```

Si falla, usar la [plantilla de bugs](../../plantilla-reporte-bug.md) y enlazar
la ficha. Al terminar, conciliar el encabezado, los conteos, el dictamen por RF
y la lista de requisitos con los resultados observados; no aprobar únicamente
por haber tomado capturas.
