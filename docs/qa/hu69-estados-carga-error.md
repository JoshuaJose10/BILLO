# QA: HU-69 — Estados de carga y error con «Reintentar»

Fecha: 2026-11-12. Todas las pantallas que piden datos usan `EstadoPantalla`
(`mobile/src/components/EstadoPantalla.js`): cargando, error con Reintentar y vacío.

## Qué cambió para quien prueba

- **Timeout de 15 s** (`TIMEOUT_MS` en `mobile/src/config/api.js`). Al vencer, o sin red, o con
  el servidor apagado, el error es «Sin conexión» / «Revisa tu internet e intenta de nuevo.»; con
  un 5xx genérico, «Algo salió mal de nuestro lado» / «Intenta de nuevo en un momento.» (textos en
  `textosError`, `mobile/src/utils/errores.js`). Un 5xx con código propio (502
  `FUENTE_NO_DISPONIBLE` del tipo de cambio) conserva su mensaje.
- **Reintentar**: vibración ligera; el error sigue a la vista con el botón en cargando y solo
  se vuelve a pedir lo que falló. Si vuelve a fallar, el mensaje se queda; si responde, aparecen
  los datos. No hace falta reiniciar la app.
- **Vacío ≠ error**: el vacío lleva su ícono, texto propio y acción («Registrar gasto», «Crear tu
  primer presupuesto», «Agregar tu primera suscripción»); el error lleva el ícono sin wifi en un
  squircle de vidrio y el botón secundario «Reintentar».
- **Inicio con datos a la vista**: si una recarga falla, los datos se quedan y arriba sale un
  aviso con borde rojo, «Sin conexión · Reintentar»; sin datos, el error ocupa la pantalla.
- Hojas (Nuevo gasto, Presupuesto, Membresía): fila compacta «No se pudieron cargar» + chip
  «Reintentar».
- Pull-to-refresh sigue igual en Inicio, Movimientos, Reportes y Cartera.

## Cobertura del reporte HU-40 (`docs/app-sprint2-reporte.md`)

| Caso | Cómo queda cubierto |
|---|---|
| F1 Sin conexión | Sin red `fetch` falla → `SIN_CONEXION` → `EstadoPantalla` de error con Reintentar en las 8 pantallas; ninguna rama de render queda sin contenido (cargando, error, vacío o datos). Las hojas conservan lo capturado: solo cambia la fila de categorías/catálogo. |
| F2 Reconexión | Reintentar llama otra vez a la carga de esa pantalla (y a categorías si fallaron); al responder se muestran los datos. También se reintenta solo al enfocar la pantalla o volver a primer plano (categorías, HU-80). |
| F7 Servidor caído | Servidor apagado → error inmediato; IP inaccesible → error a los 15 s como máximo; 5xx genérico → mismo error. Probado con el `apiFetch` real (abajo). |

## Prueba contra el backend local (2026-11-12)

| Escenario | Resultado |
|---|---|
| Backend apagado (`http://localhost:3999`) | `SIN_CONEXION`, status 0, en 0.1 s |
| IP inaccesible (`http://10.255.255.1:3000`) | `SIN_CONEXION` a los 10.6 s: en Node el `fetch` corta la conexión a los 10 s, antes que nuestro timeout. En el teléfono manda el de 15 s (pruebas con timers en `api.test.mjs`) |
| Cuenta nueva | `/gastos` y `/presupuestos` → `[]` → vista «vacío» |
| BD local sin migraciones 017/018 | `/membresias` y `/reportes/resumen` → 500 `ERROR_SERVIDOR` → `SIN_CONEXION` con Reintentar (antes: «Hubo un problema en el servidor») |

## Casos manuales en el iPhone

| # | Pasos | Esperado |
|---|---|---|
| 1 | Abrir Inicio, Movimientos, Reportes y Cartera (Presupuestos y Suscripciones) con modo avión desde el arranque | Spinner y luego error con Reintentar en cada una; nunca pantalla en blanco |
| 2 | Con modo avión, tocar Reintentar | Vibración ligera, botón en cargando y vuelve el error |
| 3 | Quitar modo avión y tocar Reintentar en las 4 pantallas | Cargan los datos sin reiniciar la app |
| 4 | Con datos en Inicio, activar modo avión y jalar para refrescar | Los datos se quedan; aparece el aviso compacto con Reintentar |
| 5 | Modo avión → abrir Nuevo gasto y escribir un monto | La fila de categorías dice «No se pudieron cargar» con chip Reintentar; el monto se conserva |
| 6 | Cuenta nueva sin datos | Vacíos con su acción, distintos del error |
| 7 | Repetir 1 y 6 en claro y oscuro | Textos e íconos legibles en ambos |
| 8 | Backend local con IP de la PC apagada | Error en ≤ 15 s; al encenderlo, Reintentar carga |
