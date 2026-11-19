# Evidencias HU-91

Fecha: 2026-11-19, America/Mexico_City. [Reporte completo](../hu91-reporte.md).

38 capturas originales del teléfono físico, sin edición. La imagen 39 es una exportación del reporte de API, identificada como tal; no representa la interfaz de Postman. SHA-256, dimensiones y origen: [índice JSON](indice-capturas.json).

| Archivo | Contenido observado |
| --- | --- |
| [01-registro-a.png](01-registro-a.png) | Cuenta A: formulario de registro en claro, contraseña oculta. |
| [02-onboarding-claro.png](02-onboarding-claro.png) | Cuenta A: Elige tus categorías, catálogo inicial con 14 activas. |
| [03-onboarding-tres-seleccion.png](03-onboarding-tres-seleccion.png) | Cuenta A: final del selector después de desactivar once predefinidas. |
| [04-gasto-solo-tres.png](04-gasto-solo-tres.png) | Cuenta A: Nuevo gasto con Entretenimiento, Comida y Transporte. |
| [05-gasto-predefinida-100.png](05-gasto-predefinida-100.png) | Cuenta A: importe de 100 antes de seleccionar la categoría. |
| [06-gasto-predefinida-guardado.png](06-gasto-predefinida-guardado.png) | Cuenta A: gasto de 100 en Entretenimiento guardado desde Android. |
| [07-mis-categorias-claro.png](07-mis-categorias-claro.png) | Mis categorías en tema claro, selección previa a ocultar Entretenimiento. |
| [08-ocultar-predefinida.png](08-ocultar-predefinida.png) | Entretenimiento inactiva y aviso de conservación de históricos. |
| [09-no-cero-categorias.png](09-no-cero-categorias.png) | Rechazo al intentar apagar la última predefinida activa. |
| [10-crear-propia.png](10-crear-propia.png) | Crear HU91 Propia desde Mis categorías. |
| [11-propia-creada.png](11-propia-creada.png) | HU91 Propia ya guardada en la lista. |
| [12-renombrar-propia.png](12-renombrar-propia.png) | Formulario para renombrar a HU91 Renombrada. |
| [13-propia-renombrada.png](13-propia-renombrada.png) | HU91 Renombrada guardada en la lista. |
| [14-movimientos-categoria-oculta.png](14-movimientos-categoria-oculta.png) | Movimientos conserva Entretenimiento oculta y gasto de 100. |
| [15-gasto-propia-50.png](15-gasto-propia-50.png) | Nuevo gasto: HU91 Renombrada seleccionada, importe 50. |
| [16-movimientos-ambas.png](16-movimientos-ambas.png) | Movimientos: gasto oculto de 100 y propia de 50, total 150. |
| [17-reportes-propia-oculta.png](17-reportes-propia-oculta.png) | Reportes: dona de 150, roja para propia y morada para Entretenimiento. |
| [18-reportes-detalle-categorias.png](18-reportes-detalle-categorias.png) | Reportes: desglose de ambas categorías, montos y colores. |
| [19-presupuesto-oculto-visible.png](19-presupuesto-oculto-visible.png) | Presupuesto de Entretenimiento oculta permanece visible: 100 de 500. |
| [20-presupuesto-categorias-disponibles.png](20-presupuesto-categorias-disponibles.png) | Nuevo presupuesto ofrece las categorías disponibles y excluye la oculta. |
| [21-mis-categorias-oscuro.png](21-mis-categorias-oscuro.png) | Mis categorías en tema oscuro, estado activo e inactivo legible. |
| [22-confirmar-borrado-en-uso.png](22-confirmar-borrado-en-uso.png) | Confirmación de borrado de HU91 Renombrada con gasto. |
| [23-categoria-en-uso.png](23-categoria-en-uso.png) | Rechazo de borrado: categoría tiene gastos o presupuestos. |
| [24-propia-temporal.png](24-propia-temporal.png) | HU91 Temporal creada sin uso en tema oscuro. |
| [25-propia-temporal-eliminada.png](25-propia-temporal-eliminada.png) | Después de confirmar la eliminación de HU91 Temporal. |
| [26-registro-b-oscuro.png](26-registro-b-oscuro.png) | Cuenta B: formulario de registro en oscuro, contraseña oculta. |
| [27-onboarding-oscuro.png](27-onboarding-oscuro.png) | Cuenta B: Elige tus categorías en tema oscuro. |
| [28-onboarding-agregar-propia.png](28-onboarding-agregar-propia.png) | Cuenta B: agregar HU91 Alta durante el onboarding. |
| [29-onboarding-propia-pendiente.png](29-onboarding-propia-pendiente.png) | HU91 Alta pendiente en onboarding antes de Continuar. |
| [30-visitante-inicio.png](30-visitante-inicio.png) | Visitante: inicio con datos de ejemplo y acceso directo sin onboarding. |
| [31-visitante-categorias.png](31-visitante-categorias.png) | Visitante: Nuevo gasto solicita crear cuenta para poder guardar. |
| [32-propia-alta-en-nuevo-gasto.png](32-propia-alta-en-nuevo-gasto.png) | Cuenta B: propia del onboarding ofrecida en Nuevo gasto. |
| [33-gasto-propia-alta.png](33-gasto-propia-alta.png) | Cuenta B: gasto de 50 con HU91 Alta seleccionada. |
| [34-propia-alta-gasto-guardado.png](34-propia-alta-gasto-guardado.png) | Cuenta B: gasto de HU91 Alta persistido, tema oscuro; barra activa vacía. |
| [35-visitante-predefinidas.png](35-visitante-predefinidas.png) | Visitante: Movimientos, categorías predefinidas y datos locales. |
| [36-visitante-predefinidas-final.png](36-visitante-predefinidas-final.png) | Visitante: extremo final del selector de categorías predefinidas. |
| [37-navbar-cartera-claro.png](37-navbar-cartera-claro.png) | Bug exploratorio: Cartera activa sin icono ni etiqueta, después de esperar. |
| [38-navbar-inicio-claro.png](38-navbar-inicio-claro.png) | Bug exploratorio: Inicio activo sin icono ni etiqueta, después de esperar. |
| [39-api-resumen.png](39-api-resumen.png) | Exportación visual generada desde JSON reales de API; no es UI de Postman. |

API: [Postman/Newman](api-postman.json), [corrida ampliada](api-ampliada.json), [resumen visual](39-api-resumen.png) y [HTML de origen](api-resumen.html). Datos de ambiente: [ambiente.json](ambiente.json).
