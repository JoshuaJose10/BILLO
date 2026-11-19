# HU-91 — QA de categorías por usuario

Responsable: Luis Dorian · QA. Ejecución: **2026-11-19**, America/Mexico_City.
Alcance: HU-88 (API), HU-89 (selección al registrarse) y HU-90 (Mis categorías).

**Resultado: 11 de 12 casos mínimos pasan; 1 bloqueado por falta de cuenta antigua.**
La revisión exploratoria detectó además un defecto visual en la barra de navegación,
documentado en [HU91-UI-01](bugs/HU91-UI-01-pestana-activa-invisible.md).
No se declara HU-91 completa ni se sustituye la revisión del equipo.

## Ambiente y trazabilidad

| Campo | Valor |
| --- | --- |
| Teléfono físico | Samsung Galaxy A8, SM-A530F; Android 9; 1080 × 2220 |
| Ejecución móvil | Interacción real mediante ADB: toques, teclado, desplazamientos y capturas originales PNG |
| App instalada | `com.billo.app`, versión `1.0.0`, versionCode `2`; perfil EAS `release`, SDK 58 |
| APK | [v1.0.0-final/billo.apk](https://github.com/JoshuaJose10/BILLO/releases/download/v1.0.0-final/billo.apk) |
| Build EAS | `96cc181b-59ee-4f69-bf6e-64743c75d2b0` |
| SHA-256 del APK instalado | `9b76fce17ebf481784fd8dfaa304bb65b3b9650ff709ab013279791f052f2f08` |
| Origen | `develop`, commit `6281015ba698ec523bb4c6d99672c230788e0d75` |
| API real | `https://billo-api-v30t.onrender.com`; `/health` respondió 200 |
| Backend desplegado | El servicio no expone el commit en `/health`; no se equipara al checkout local |
| Contrato | [api-contrato.md](../api-contrato.md) — v1.5, sección Categorías |
| API / herramientas | Node 22.15.0; Newman 6.2.3 sobre la colección JSON existente |

El APK se extrajo del teléfono con `adb pull` y su hash coincide con el archivo
del release previamente comprobado. Las pruebas no usan Expo Go ni Metro.
Los metadatos y hashes de las evidencias están en
[ambiente.json](hu91-evidencias/ambiente.json) e
[indice-capturas.json](hu91-evidencias/indice-capturas.json).

## Datos de prueba

- **QA HU91 A**, creada desde el APK en tema claro: se dejaron activas
  Entretenimiento, Comida y Transporte. Se registró desde Android un gasto de
  **$100** en Entretenimiento y se preparó mediante API un presupuesto de **$500**
  en esa categoría. Después se ocultó Entretenimiento, se comprobó el mínimo de
  una predefinida y se creó `HU91 Propia`, renombrada a `HU91 Renombrada`.
  Un segundo gasto de **$50** se registró desde Android en esa propia.
  `HU91 Temporal` se creó y eliminó sin uso.
- **QA HU91 B**, creada desde el APK en tema oscuro: se agregó `HU91 Alta`
  durante «Elige tus categorías», se continuó con las 14 predefinidas y esa propia,
  y se registró un gasto de **$50** en ella. La API confirmó su persistencia y el
  color asignado `#EF4444`.
- **Visitante**: datos de ejemplo, con sus ocho categorías predefinidas locales.
  Se verificó el cambio desde una cuenta con categoría propia al visitante.
- La corrida ampliada de API crea sus dos cuentas exclusivas y las elimina,
  con sus datos, al terminar. La corrida Postman deja dos cuentas QA sin gastos;
  su categoría propia se elimina dentro de la colección. Las cuentas móviles A/B
  se conservan para reprueba; sus credenciales no están en las evidencias ni en Git.

El [dataset del presupuesto](hu91-evidencias/dataset-presupuesto-ui.json)
distingue la preparación por API de las operaciones ejecutadas por interfaz.
Los [datos finales de B](hu91-evidencias/dataset-b-final.json) verifican el gasto
registrado con la propia del onboarding. El teléfono quedó en modo visitante y
se restauró el tema Automático que estaba seleccionado al iniciar.

## Matriz de ejecución en Android

Cada fila describe las acciones realmente realizadas. Los enlaces abren las
capturas del caso; el [índice completo](hu91-evidencias/README.md) describe las
38 capturas del teléfono y la exportación visual de API. Las capturas conservan
su contenido original, sin montajes.

| Caso | Pasos y resultado observado | Estado | Evidencia |
| --- | --- | --- | --- |
| CP-HU91-01 · Nuevo usuario, tres categorías | Crear A → aparece «Elige tus categorías» con 14 activas → desactivar once → Continuar → Nuevo gasto ofrece Entretenimiento, Comida y Transporte. Se guardó $100 en Entretenimiento. | Pasa | [Registro](hu91-evidencias/01-registro-a.png), [onboarding](hu91-evidencias/02-onboarding-claro.png), [selección](hu91-evidencias/03-onboarding-tres-seleccion.png), [Nuevo gasto](hu91-evidencias/04-gasto-solo-tres.png), [guardado](hu91-evidencias/06-gasto-predefinida-guardado.png) |
| CP-HU91-02 · Propia durante el alta | Crear B → Agregar categoría → `HU91 Alta` → Crear → Continuar → desplazar las categorías de Nuevo gasto hasta la propia → seleccionar y guardar $50. Persiste con el nombre y color asignado. | Pasa | [Alta propia](hu91-evidencias/28-onboarding-agregar-propia.png), [pendiente de continuar](hu91-evidencias/29-onboarding-propia-pendiente.png), [selección](hu91-evidencias/32-propia-alta-en-nuevo-gasto.png), [importe](hu91-evidencias/33-gasto-propia-alta.png), [guardado](hu91-evidencias/34-propia-alta-gasto-guardado.png) |
| CP-HU91-03 · Usuario antiguo | Iniciar sesión con cuenta creada antes de la migración 020; debe entrar directamente y conservar todas sus predefinidas. El usuario confirmó que no dispone de una cuenta antigua de QA. No se ejecutó ni se usó una cuenta nueva configurada para simularla. | **Bloqueado** | Falta cuenta de QA anterior a la migración con procedencia comprobable. La migración se revisó solo como código, sin atribuirle un resultado manual. |
| CP-HU91-04 · Ocultar predefinida con historial | En A, Perfil → Mis categorías → apagar Entretenimiento después del gasto de $100. Se muestra el aviso de conservación; Movimientos sigue mostrando nombre e importe y Reportes sigue sumándolo. | Pasa | [Apagada y aviso](hu91-evidencias/08-ocultar-predefinida.png), [Movimientos](hu91-evidencias/14-movimientos-categoria-oculta.png), [Reportes](hu91-evidencias/17-reportes-propia-oculta.png) |
| CP-HU91-05 · Crear, renombrar y borrar propias | En Mis categorías crear `HU91 Propia`, renombrar a `HU91 Renombrada`; Nuevo gasto muestra el nuevo nombre. Crear `HU91 Temporal` sin uso y confirmar su eliminación; desaparece de la lista y de la consulta API final. | Pasa | [Crear](hu91-evidencias/10-crear-propia.png), [creada](hu91-evidencias/11-propia-creada.png), [renombrar](hu91-evidencias/12-renombrar-propia.png), [renombrada](hu91-evidencias/13-propia-renombrada.png), [temporal](hu91-evidencias/24-propia-temporal.png), [eliminada](hu91-evidencias/25-propia-temporal-eliminada.png) |
| CP-HU91-06 · Borrar propia en uso | Después de guardar $50 en `HU91 Renombrada`, tocar Borrar y confirmar. Aparece «Esta categoría tiene gastos o presupuestos; no se puede borrar». La categoría permanece. | Pasa | [Confirmación](hu91-evidencias/22-confirmar-borrado-en-uso.png), [rechazo](hu91-evidencias/23-categoria-en-uso.png) |
| CP-HU91-07 · No permitir cero activas | Después de ocultar Entretenimiento, apagar Transporte y tratar de apagar Comida, última predefinida activa. Aparece «Debes tener al menos una categoría» y se conserva Comida activa. La API también rechaza `categoria_ids: []` con 400 `SELECCION_VACIA`. | Pasa | [Alerta](hu91-evidencias/09-no-cero-categorias.png), [API ampliada](hu91-evidencias/api-ampliada.json) |
| CP-HU91-08 · Presupuestos | Tras ocultar Entretenimiento, Cartera → Presupuestos conserva su límite $500, gasto $100 y avance 20 %. Nuevo presupuesto ofrece las disponibles Comida y `HU91 Renombrada`; no ofrece Entretenimiento. | Pasa | [Existente](hu91-evidencias/19-presupuesto-oculto-visible.png), [nuevo](hu91-evidencias/20-presupuesto-categorias-disponibles.png) |
| CP-HU91-09 · Reportes y dona | Con $100 de Entretenimiento oculta y $50 de `HU91 Renombrada`, Reportes muestra $150, reparto 66.7 % / 33.3 %, propia roja y predefinida morada; el detalle conserva ambas. | Pasa | [Dos movimientos](hu91-evidencias/16-movimientos-ambas.png), [dona](hu91-evidencias/17-reportes-propia-oculta.png), [detalle](hu91-evidencias/18-reportes-detalle-categorias.png), [color API](hu91-evidencias/categorias-a-final.json) |
| CP-HU91-10 · Visitante | Explorar sin cuenta entra directamente, usa categorías de ejemplo predefinidas y no mezcla las propias de A/B. Movimientos y su selector muestran las de ejemplo. Nuevo gasto pide crear cuenta para guardar, según el flujo de visitante. | Pasa | [Inicio visitante](hu91-evidencias/30-visitante-inicio.png), [restricción de guardado](hu91-evidencias/31-visitante-categorias.png), [selector inicial](hu91-evidencias/35-visitante-predefinidas.png), [final del selector](hu91-evidencias/36-visitante-predefinidas-final.png), [lectura de UI](hu91-evidencias/visitante-ui.json) |
| CP-HU91-11 · Temas en onboarding | Revisar títulos, filas, interruptores y acciones del onboarding claro de A y oscuro de B; abrir Agregar categoría en ambas variantes. Textos y controles legibles; los campos y botones permiten terminar el flujo. | Pasa | [Claro](hu91-evidencias/02-onboarding-claro.png), [oscuro](hu91-evidencias/27-onboarding-oscuro.png), [hoja oscura](hu91-evidencias/28-onboarding-agregar-propia.png) |
| CP-HU91-12 · Temas en Mis categorías | Revisar Mis categorías en claro, cambiar a Oscuro desde Perfil y volver. Se distinguen filas activas/inactivas, propias y acciones; crear y eliminar una propia en oscuro. | Pasa | [Claro](hu91-evidencias/07-mis-categorias-claro.png), [oscuro](hu91-evidencias/21-mis-categorias-oscuro.png), [propias en oscuro](hu91-evidencias/24-propia-temporal.png) |

## API real: colección y comprobaciones ampliadas

Se ejecutó con Newman la colección actual del repositorio
`docs/postman/billo-api.postman_collection.json`, sin modificarla: registro/login
de A/B y las once solicitudes de la carpeta «02 Categorías — catálogo».
**15/15 peticiones y 68/68 aserciones pasan**, sin errores de transporte o script.
Es una selección de la colección, no una aprobación de toda la colección ni una
sesión manual de la interfaz de Postman.

Evidencia de peticiones, estados HTTP, respuestas sanitizadas y aserciones:
[api-postman.json](hu91-evidencias/api-postman.json).

La corrida ampliada hizo **32/32 peticiones correctas**, incluidas dos solicitudes
de limpieza. Cubre onboarding y selección de tres, selección vacía, CRUD propio,
color, aislamiento A/B, uso de categoría ajena, propias usadas por gastos y por
presupuestos, rechazo de nuevas operaciones con ocultas y conservación de
históricos, presupuestos y totales. Evidencia:
[api-ampliada.json](hu91-evidencias/api-ampliada.json).

No se suman esas cifras a los doce casos manuales ni se consideran evidencia de
la migración de un usuario antiguo. No se guardaron tokens, claves ni reportes
crudos de Newman. Se incluye una [exportación visual de los resultados](hu91-evidencias/39-api-resumen.png),
generada desde los JSON reales y su [versión HTML](hu91-evidencias/api-resumen.html).
Está identificada como resumen del reporte; no representa una ventana de Postman.

Para repetir desde la raíz, con `backend/node_modules` instalado:

```powershell
node backend/qa/categorias-postman-hu91.cjs
node backend/qa/categorias-hu91.cjs
```

Ambos comandos apuntan a la API real y crean cuentas QA nuevas. El segundo usa
un dataset fijo de noviembre de 2026 y elimina sus propias cuentas al finalizar.
`QA_API_URL` permite dirigir únicamente la corrida ampliada a otro servidor.
El primer runner conserva dos cuentas QA; los scripts de la colección eliminan
su propia categoría de prueba. Las evidencias anteriores se sobrescriben al
repetir; copiarlas antes si se necesita conservar ambas corridas.

Los dos runners pasan ESLint. No se cambiaron la app, la API ni la colección.

## Defectos y pendientes de cierre

- **HU91-UI-01**, severidad Baja, abierto: icono y etiqueta de la pestaña activa
  no visibles en la barra inferior. Reproducido en claro y observado también en
  oscuro, con cuenta y visitante. Es un hallazgo exploratorio general; las dos
  pantallas nuevas de categorías no incluyen esa barra. Ver
  [reporte con plantilla](bugs/HU91-UI-01-pestana-activa-invisible.md).
- **CP-HU91-03 bloqueado**: conseguir cuenta de QA anterior a la migración 020
  y registrar login directo y catálogo completo con capturas. No se marca como
  bug de la aplicación.
- Revisión y aceptación final del equipo pendientes. No se publicaron mensajes,
  comentarios ni cambios de estado en servicios externos.
