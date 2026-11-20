# QA final integral — resumen de verificaciones

Fecha: **2026-11-19**, America/Mexico_City. Responsable: Luis Dorian. Rama: test/qa-final.

**Documento de alcance parcial. No acredita aprobación integral de la aplicación ni correcciones de código.** Los resultados corresponden únicamente a los casos publicados aquí.

Casos publicados: **63** — 50 Pasa, 2 Falla y 11 Bloqueado. Las dos fallas publicadas corresponden a una misma observación de presentación no bloqueante.

## Ambiente

| Dato | Valor |
|---|---|
| Dispositivo | Samsung Galaxy A8 SM-A530F, Android9, 1080×2220 |
| APK | Release1.0.0, versionCode2, com.billo.app |
| Commit del APK | 6281015ba698ec523bb4c6d99672c230788e0d75 |
| SHA-256 del APK instalado | 9b76fce17ebf481784fd8dfaa304bb65b3b9650ff709ab013279791f052f2f08 |
| EAS build | 96cc181b-59ee-4f69-bf6e-64743c75d2b0 |
| Release | [v1.0.0-final](https://github.com/JoshuaJose10/BILLO/releases/tag/v1.0.0-final) |
| API | https://billo-api-v30t.onrender.com; commit desplegado no expuesto |

Se utilizó el APK ya instalado, sin recompilarlo. Se hicieron comprobaciones selectivas del dispositivo y de la API real, reutilizando estados compartidos entre casos. B fue una cuenta desechable y se eliminó al verificar Perfil; se canceló la recurrencia de prueba de A conservando su ingreso.

## Casos de regresión publicados

| Caso | Resultado observado | Estado | Evidencia |
|---|---|---|---|
| CP-RF1-01 | Registro real de A desde la invitación de visitante; cuenta vacía. | **Pasa** | [1](qa-final-evidencias/RF1-01-registro.png) · [2](qa-final-evidencias/RF1-01-RF10-05-cuenta-vacia.png) |
| CP-RF1-02 | Login correcto permite acceder a los registros de A. | **Pasa** | [1](qa-final-evidencias/RF1-02-datos-restaurados-login.png) |
| CP-RF1-03 | Mismo correo desechable: HTTP 409, sin segunda cuenta (API). | **Pasa** | [1](qa-final-evidencias/API-CP-RF1-03.png) |
| CP-RF1-04 | Contraseña incorrecta rechazada en APK, mensaje de credenciales inválidas. | **Pasa** | [1](qa-final-evidencias/RF1-04-credenciales-invalidas.png) |
| CP-RF2-01 | 80.50 MXN/Comida/hoy persistidos. Variante tarjeta QA 4242 para cruzar TAR-03; Efectivo se observa en RF12. | **Pasa** | [1](qa-final-evidencias/RF2-01-TAR-03-formulario.png) · [2](qa-final-evidencias/RF2-01-RF10-05-gasto-persistido.png) |
| CP-RF2-02 | POST con monto ochenta devuelve 400 y no guarda (API). | **Pasa** | [1](qa-final-evidencias/API-CP-RF2-02.png) |
| CP-RF2-03 | Formulario con 80.50 sin categoría impide guardar. | **Pasa** | [1](qa-final-evidencias/RF2-03-categoria-obligatoria.png) |
| CP-RF3-01 | Comida, noviembre: presupuesto de 2000 creado en APK. | **Pasa** | [1](qa-final-evidencias/RF3-01-presupuesto-2000.png) |
| CP-RF3-02 | Presupuesto -500 rechazado con 400 (API); teclado APK no ofrece signo negativo. | **Pasa** | [1](qa-final-evidencias/API-CP-RF3-02.png) |
| CP-RF4-01 | B: Comida 700+100=800, límite 1000; toast y tarjeta Cerca del límite al 80%. Otra categoría 25 queda separada. | **Pasa** | [1](qa-final-evidencias/RF4-01-alerta-800.png) |
| CP-RF4-02 | B: Comida 950+100=1050, límite 1000; toast y tarjeta Excedido al 105%. | **Pasa** | [1](qa-final-evidencias/RF4-02-alerta-1050.png) |
| CP-RF4-03 | B: Comida 100+50=150,15%; gasto guardado sin toast de alerta ni tarjeta de riesgo. | **Pasa** | [1](qa-final-evidencias/RF4-03-sin-alerta-150.png) |
| CP-RF4-04 | 799.90: estado ok; ver secuencia POST y PUT independiente en traza API. | **Pasa** | [1](qa-final-evidencias/API-CP-RF4-04-07.png) |
| CP-RF4-05 | 800: estado alerta en POST y PUT (API). | **Pasa** | [1](qa-final-evidencias/API-CP-RF4-04-07.png) |
| CP-RF4-06 | 1000: alerta, todavía no excedido, POST y PUT (API). | **Pasa** | [1](qa-final-evidencias/API-CP-RF4-04-07.png) |
| CP-RF4-07 | 1000.10: excedido, POST y PUT (API). | **Pasa** | [1](qa-final-evidencias/API-CP-RF4-04-07.png) |
| CP-RF5-01 | Netflix 199 mensual con cobro 29/nov, diez días después; lista y asociación a tarjeta correctas. | **Pasa** | [1](qa-final-evidencias/RF5-01-TAR-03-suscripcion-formulario.png) · [2](qa-final-evidencias/RF5-01-suscripcion-guardada.png) |
| CP-RF5-02 | Costo modificado a 219 y posterior eliminación desde APK. | **Pasa** | [1](qa-final-evidencias/RF5-02-costo-editado.png) · [2](qa-final-evidencias/RF5-02-suscripcion-eliminada.png) |
| CP-RF5-03 | Formulario sin nombre rechaza guardar. | **Pasa** | [1](qa-final-evidencias/RF5-03-nombre-obligatorio.png) |
| CP-RF5-04 | POST costo abc devuelve 400 (API); teclado APK es numérico. | **Pasa** | [1](qa-final-evidencias/API-CP-RF5-04.png) |
| CP-RF6-01 | APK y API: variable 500 + fijo 300 = total 800; captura antes de añadir fixture RF8. | **Pasa** | [1](qa-final-evidencias/RF6-01-variable-500-fijo-300-total-800.png) |
| CP-RF6-02 | Cuenta nueva: variable, fijo y total cero. | **Pasa** | [1](qa-final-evidencias/RF6-02-RF8-02-sin-gastos.png) |
| CP-RF7-01 | Sin acceso al job/despliegue para ejecutar aviso D+3 y registrar recepción real. | **Bloqueado** | Sin ejecución acreditada |
| CP-RF7-02 | Sin ejecución controlada del job con fecha D; ausencia de aviso por sí sola no prueba D+10. | **Bloqueado** | Sin ejecución acreditada |
| CP-RF7-03 | Sin job controlable para verificar exclusión de membresía eliminada. | **Bloqueado** | Sin ejecución acreditada |
| CP-RF7-04 | Sin job, token push/control de envío y contadores para D+2/deep link. | **Bloqueado** | Sin ejecución acreditada |
| CP-RF7-05 | Depende del primer envío comprobado y de ejecutar el job dos veces en D. | **Bloqueado** | Sin ejecución acreditada |
| CP-RF7-06 | Sin control de token push NULL, cuenta control y contadores del job remoto. | **Bloqueado** | Sin ejecución acreditada |
| CP-RF8-01 | Comida 600(60%), Transporte 300(30%) y Entretenimiento 100(10%, Ocio del ejemplo); dona y desglose coinciden con API. Fijo 300 va separado. | **Pasa** | [1](qa-final-evidencias/RF8-01-reparto-60-30-10.png) · [2](qa-final-evidencias/RF8-01-desglose.png) |
| CP-RF8-02 | Reporte sin datos muestra estado vacío legible. | **Pasa** | [1](qa-final-evidencias/RF6-02-RF8-02-sin-gastos.png) |
| CP-RF9-02 | Usuario normal: POST, PUT y DELETE de catálogo devuelven 403; IDs inexistentes evitan afectar servicios reales. | **Pasa** | [1](qa-final-evidencias/API-CP-RF9-02.png) |
| CP-RF10-01 | Inicio, Movimientos, Cartera y Reportes muestran demo local. | **Pasa** | [1](qa-final-evidencias/RF10-01-inicio.png) · [2](qa-final-evidencias/RF10-01-movimientos.png) · [3](qa-final-evidencias/RF10-01-cartera.png) · [4](qa-final-evidencias/RF10-01-reportes.png) |
| CP-RF10-02 | Altas y entrada a edición de gasto/presupuesto/suscripción muestran Crear cuenta; Seguir explorando conserva demo. Borrado queda inaccesible detrás de la edición bloqueada; no se afirma haber pulsado un botón que no aparece. | **Pasa** | [1](qa-final-evidencias/RF10-02-bloqueo-gasto.png) · [2](qa-final-evidencias/RF10-02-bloqueo-presupuesto.png) · [3](qa-final-evidencias/RF10-02-bloqueo-suscripcion.png) · [4](qa-final-evidencias/RF10-02-bloqueo-edicion-gasto.png) · [5](qa-final-evidencias/RF10-02-bloqueo-edicion-presupuesto.png) · [6](qa-final-evidencias/RF10-02-bloqueo-edicion-suscripcion.png) |
| CP-RF10-03 | Desde onboarding: Omitir y Explorar, dos toques. Captura de bienvenida posterior a Omitir. | **Pasa** | [1](qa-final-evidencias/RF10-03-acceso-explorar.png) |
| CP-RF10-04 | Parte visual comprobada: arranque en frío, cuatro pantallas, filtro Comida y mes anterior sin red. No se dispone de instrumentación HTTP del APK para acreditar ausencia de intentos de solicitud; no se aprueba esa parte por inferencia. | **Bloqueado** | [1](qa-final-evidencias/RF10-04-inicio-sin-red.png) · [2](qa-final-evidencias/RF10-04-movimientos-sin-red.png) · [3](qa-final-evidencias/RF10-04-cartera-sin-red.png) · [4](qa-final-evidencias/RF10-04-reportes-sin-red.png) · [5](qa-final-evidencias/RF10-04-filtro-sin-red.png) · [6](qa-final-evidencias/RF10-04-mes-anterior-sin-red.png) |
| CP-RF10-05 | Crear cuenta desde invitación sale de demo; inicia en cero; gasto 80.50 permanece al volver a autenticarse. | **Pasa** | [1](qa-final-evidencias/RF1-01-RF10-05-cuenta-vacia.png) · [2](qa-final-evidencias/RF2-01-RF10-05-gasto-persistido.png) · [3](qa-final-evidencias/RF1-02-datos-restaurados-login.png) |
| CP-RF11-01 | 10 USD por r=18.5759 produce 185.76 MXN; original y tasa persistidos, con suma variable única contrastada en API. | **Pasa** | [1](qa-final-evidencias/RF11-01-usd-conversion.png) · [2](qa-final-evidencias/RF11-01-gasto-usd-guardado.png) · [3](qa-final-evidencias/RF11-01-total-convertido.png) |
| CP-RF11-02 | No hay control de fuente/cache remota para producir 502 sin tasa manteniendo API accesible. Apagar el teléfono no simula ese caso. | **Bloqueado** | Sin ejecución acreditada |
| CP-RF11-03 | Suscripción 10 USD equivalente 185.76 MXN, frecuencia/fecha correctas, persistencia contrastada por API. | **Pasa** | [1](qa-final-evidencias/RF11-03-suscripcion-usd.png) · [2](qa-final-evidencias/RF11-03-suscripcion-guardada.png) |
| CP-RF11-04 | Sin control de fallo de fuente remota y vaciado de cache para suscripción. | **Bloqueado** | Sin ejecución acreditada |
| CP-RF11-05 | Sin control de fallo de fuente después de obtener tasa; no se declara uso de cache sin provocarlo. | **Bloqueado** | Sin ejecución acreditada |
| CP-RF11-06 | Editar a 199 MXN deja monto_original y tipo_cambio NULL; costo reemplazado. | **Pasa** | [1](qa-final-evidencias/RF11-06-regreso-mxn.png) |
| CP-RF12-01 | Voz real llena 80 y Comida; antes de confirmar seguían solo dos gastos en API; confirmación explícita guarda uno. Posteriormente editado/eliminado para RF13. | **Pasa** | [1](qa-final-evidencias/RF12-01-resultado-dictado.png) · [2](qa-final-evidencias/RF12-01-gasto-confirmado.png) |
| CP-RF12-02 | Intentos de frase, ruido y silencio mantienen monto/categoría vacíos con aviso. Frase terminó No te escuché; otros No entendí el monto. Manual 85 verificado después de corregir entrada de QA. | **Pasa** | [1](qa-final-evidencias/RF12-02-frase-resultado.png) · [2](qa-final-evidencias/RF12-02-ruido-resultado.png) · [3](qa-final-evidencias/RF12-02-silencio-resultado.png) · [4](qa-final-evidencias/RF12-02-manual-85-formulario.png) · [5](qa-final-evidencias/RF12-02-guardado-manual-85.png) |
| CP-RF13-01 | Widget existente visible y abre desde encabezado; muestra saldo, sin mes/total mensual exigidos. QA-FINAL-02. Selector/alta no se usa para reemplazar ese criterio fallido. | **Falla** | [1](qa-final-evidencias/RF13-01-widget-base.png) · [2](qa-final-evidencias/RF13-01-toque-widget.png) |
| CP-RF13-02 | 80, edición 95.50 y borrado actualizan saldo; cobro exigible 100 suma total 366.26 en Inicio/API, widget conserva saldo 1233.74. Divergencia de contrato QA-FINAL-02. | **Falla** | [1](qa-final-evidencias/RF13-02-widget-mas-80.png) · [2](qa-final-evidencias/RF13-02-widget-editado-95-50.png) · [3](qa-final-evidencias/RF13-02-widget-gasto-eliminado.png) · [4](qa-final-evidencias/RF13-02-inicio-cobro-exigible.png) · [5](qa-final-evidencias/RF13-02-widget-mas-100.png) · [6](qa-final-evidencias/RF13-02-widget-suscripcion-eliminada.png) |
| CP-RF13-03 | Conservación del dato en launcher tras reinicio real sin red: uptime193905.46→45.74 s; sin red activa antes/después; saldo1233.74 visible antes de abrir la app. | **Pasa** | [1](qa-final-evidencias/RF13-03-widget-antes-sin-red.png) · [2](qa-final-evidencias/RF13-03-ajustes-sin-red.png) · [3](qa-final-evidencias/RF13-03-widget-despues-reinicio.png) |

## Casos publicados de las tareas nuevas

| Caso | Resultado observado | Estado | Evidencia |
|---|---|---|---|
| CP-FINAL-TAR-01 | Crédito creado, editado a débito y renombrado; persistencia API/UI. | **Pasa** | [1](qa-final-evidencias/FINAL-TAR-01-creada.png) · [2](qa-final-evidencias/FINAL-TAR-01-editada-debito.png) · [3](qa-final-evidencias/API-CP-FINAL-TAR-01.png) |
| CP-FINAL-TAR-02 | Vacío en APK muestra validaciones. API rechaza tres dígitos y día de corte 32 con 400. | **Pasa** | [1](qa-final-evidencias/FINAL-TAR-02-validacion.png) · [2](qa-final-evidencias/API-CP-FINAL-TAR-02.png) |
| CP-FINAL-TAR-03 | Gasto 80.50 y suscripción 199 asociados:279.50 inicial. Con fixture fijo 300, noviembre 380.50 y octubre 300(var 0); selector APK coincide con resumen API por mes. | **Pasa** | [1](qa-final-evidencias/FINAL-TAR-03-resumen.png) · [2](qa-final-evidencias/FINAL-TAR-03-noviembre-380-50.png) · [3](qa-final-evidencias/FINAL-TAR-03-octubre.png) · [4](qa-final-evidencias/API-CP-FINAL-TAR-03.png) |
| CP-FINAL-TAR-04 | Baja desde APK confirma conservar historial: gasto 80.50 y suscripción 300 siguen visibles, tarjeta_id NULL en API y total mensual 800 sin variación. Variante API B también correcta. | **Pasa** | [1](qa-final-evidencias/FINAL-TAR-04-confirmacion.png) · [2](qa-final-evidencias/FINAL-TAR-04-tarjeta-eliminada.png) · [3](qa-final-evidencias/FINAL-TAR-04-suscripcion-conservada.png) · [4](qa-final-evidencias/FINAL-TAR-04-movimientos-conservados.png) · [5](qa-final-evidencias/FINAL-TAR-04-total-conservado.png) · [6](qa-final-evidencias/API-CP-FINAL-TAR-04.png) |
| CP-FINAL-TAR-05 | B no consulta/edita tarjeta A (404) ni registra gasto con ella (400). | **Pasa** | [1](qa-final-evidencias/API-CP-FINAL-TAR-05.png) |
| CP-FINAL-REP-01 | Ingresos noviembre 1500, fuentes 1000/500, anterior 200 y variación 1300; selector octubre muestra 200; API coincide. | **Pasa** | [1](qa-final-evidencias/FINAL-REP-01-ingresos.png) · [2](qa-final-evidencias/FINAL-REP-01-octubre-200.png) · [3](qa-final-evidencias/API-CP-FINAL-REP-01.png) |
| CP-FINAL-REP-02 | Dataset exacto: noviembre 1500−500−300=700; octubre 200−0−300=−100. Selector y serie de seis meses APK coinciden con API. Fijo normalizado 300 se aplica a ambos meses según contrato actual. | **Pasa** | [1](qa-final-evidencias/FINAL-REP-02-noviembre-700.png) · [2](qa-final-evidencias/FINAL-REP-02-octubre-menos-100.png) · [3](qa-final-evidencias/API-CP-FINAL-REP-02.png) |
| CP-FINAL-REP-03 | Cuenta nueva/mes vacío: Ingresos y Balance sin NaN ni gráfica rota. | **Pasa** | [1](qa-final-evidencias/FINAL-REP-03-sin-ingresos.png) · [2](qa-final-evidencias/FINAL-REP-03-balance-cero.png) |
| CP-FINAL-PER-01 | QA Final Editado guardado y recuperado al reingresar A; API confirma persistencia del nombre. | **Pasa** | [1](qa-final-evidencias/FINAL-PER-01-nombre-guardado.png) · [2](qa-final-evidencias/FINAL-PER-01-03-persistencia-reinicio.png) |
| CP-FINAL-PER-02 | Cambio confirmado por APK; contraseña anterior 401 y nueva 200 en API. Credenciales omitidas. | **Pasa** | [1](qa-final-evidencias/FINAL-PER-02-password-actualizada.png) · [2](qa-final-evidencias/API-CP-FINAL-PER-02.png) |
| CP-FINAL-PER-03 | Oscuro/USD se aplican a nuevo gasto y persisten tras reinicio; restablecidos Automático/MXN. Importes históricos sin conversión retroactiva. | **Pasa** | [1](qa-final-evidencias/FINAL-PER-03-oscuro-usd.png) · [2](qa-final-evidencias/FINAL-PER-03-gasto-usd.png) · [3](qa-final-evidencias/FINAL-PER-01-03-persistencia-reinicio.png) · [4](qa-final-evidencias/FINAL-PER-03-restablecido.png) |
| CP-FINAL-PER-04 | B muestra registros propios; eliminar B con contraseña vuelve a bienvenida y su login posterior devuelve401. | **Pasa** | [1](qa-final-evidencias/RF13-04-inicio-B.png) · [2](qa-final-evidencias/FINAL-PER-04-eliminar-B-confirmacion.png) · [3](qa-final-evidencias/FINAL-PER-04-B-eliminada.png) |
| CP-FINAL-EXP-01 | APK abre selector Android con CSV como texto; no se envió a terceros. API UTF-8/encabezados/escape de comas y comillas correctos. No se acredita archivo adjunto nativo .csv. | **Pasa** | [1](qa-final-evidencias/FINAL-EXP-01-compartir-csv.png) · [2](qa-final-evidencias/API-CP-FINAL-EXP-01.png) |
| CP-FINAL-EXP-02 | Octubre solo ingreso 200; vacío solo encabezados; sin JWT 401; A/B sin mezcla (API). | **Pasa** | [1](qa-final-evidencias/API-CP-FINAL-EXP-02.png) |
| CP-FINAL-REC-01 | APK mensual 1000 con próxima fecha 19/dic; API semanalD+7, quincenalD+15, mensualD+mes y 31/ene→28/feb; quitar repetición limpia próxima fecha. | **Pasa** | [1](qa-final-evidencias/FINAL-REC-01-ingreso-mensual.png) · [2](qa-final-evidencias/FINAL-REC-01-guardado.png) · [3](qa-final-evidencias/API-CP-FINAL-REC-01.png) |
| CP-FINAL-REC-02 | Sin acceso al job remoto ni fecha controlada para generación/idempotencia/cancelación. Programar una fecha no acredita generación automática. | **Bloqueado** | Sin ejecución acreditada |

## Observaciones no bloqueantes

- [QA-FINAL-02: presentación del widget frente al criterio de mes y total](bugs/QA-FINAL-02-widget-criterio-total.md), severidad Media. Billo presenta saldo disponible; el plan exige mes y total mensual. La observación permite seguir utilizando la app y requiere acordar el criterio de presentación.
- La pestaña activa pierde icono/etiqueta en la barra inferior; se documenta como observación visual de navegación.

## Resultados por RF dentro del alcance publicado

| RF | Casos publicados |
|---|---|
| RF1 | 4 Pasa |
| RF2 | 3 Pasa |
| RF3 | 2 Pasa |
| RF4 | 7 Pasa |
| RF5 | 4 Pasa |
| RF6 | 2 Pasa |
| RF7 | 6 Bloqueado |
| RF8 | 2 Pasa |
| RF9 | 1 Pasa |
| RF10 | 4 Pasa, 1 Bloqueado |
| RF11 | 3 Pasa, 3 Bloqueado |
| RF12 | 2 Pasa |
| RF13 | 1 Pasa, 2 Falla |

Estos conteos describen los casos publicados y no constituyen una aprobación general de cada requisito.

## Evidencias y validación documental

Se incluyen 99 capturas originales de Android y 17 resúmenes visuales generados de HTTP real. Los archivos API-*.png están identificados como resúmenes: no son capturas de Postman ni del APK. La traza conserva intentos de preparación que se corrigieron antes de acreditar el resultado; no se contabilizan como defectos del producto.

- [Matriz de casos](qa-final-evidencias/casos.json).
- [Traza HTTP sanitizada](qa-final-evidencias/api.jsonl) y [comprobaciones selectivas de API](qa-final-evidencias/api-resultados.json).
- [Bitácora de las capturas publicadas](qa-final-evidencias/bitacora-capturas.jsonl).
- [Manifest SHA-256](qa-final-evidencias/manifest.json): PNG en bytes exactos y texto UTF-8 normalizado a LF.
- Verificación documental: enlaces locales, JSON, integridad de PNG, hashes y ausencia de contraseñas/JWT. Las imágenes no se retocan; los logs normalizan finales de línea y espacios finales.

El alcance de esta actualización es documental. Entrega preparada para revisión; los avisos de Daily quedan a cargo del usuario.
