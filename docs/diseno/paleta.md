# Paleta de colores de Billo

Fuente de verdad: [project-brief-luminal-glow.md](stitch-paleta/project-brief-luminal-glow.md) y las
capturas de `stitch-paleta/*/screen.png`. Cualquier `DESIGN.md` de "Obsidian Luminescence" que pida
una paleta *strictly achromatic* está obsoleto: Luminal Glow agrega acento, semánticos y categorías
sobre la misma base neutra.

En código:

- Base, acento y semánticos: `mobile/src/theme/colors.js` (`temas.oscuro`, exportado como `colors`).
- Categorías: `mobile/src/theme/categorias.js` (`colorCategoria(nombre)`).

Ninguna pantalla ni componente debe usar un `#hex` o `rgba(` suelto; todo color sale de un token.
Para comprobarlo:

```sh
git grep -nE "#[0-9A-Fa-f]{3,8}\b|rgba?\(" -- mobile/src ':!mobile/src/theme'
```

Solo está implementado el **tema oscuro**.

## Base (tema oscuro)

Neutros de Obsidian Luminescence. Los sufijos numéricos (`surfaceHigh80`, `glass04`…) son la opacidad,
igual que el `/NN` de Tailwind.

### Superficies

| Token | Valor | Uso |
| --- | --- | --- |
| `background` | `#131313` | Fondo de pantalla (surface) |
| `surfaceLowest` | `#0E0E0E` | surface-container-lowest |
| `surfaceLow` | `#1B1B1B` | surface-container-low |
| `surface` | `#1F1F1F` | surface-container (inputs) |
| `surfaceHigh` | `#2A2A2A` | Avatar, ícono de gasto, pastillas |
| `surfaceHighest` | `#353535` | surface-container-highest |
| `surfaceBright` | `#393939` | surface-bright |
| `surfaceChip` | `#1C1C1E` | Chips de la tarjeta de resumen |
| `card` | `#0E0E0E` | Hojas inferiores |
| `sheet` | `rgba(14, 14, 14, 0.95)` | Hoja de Login y Registro |
| `sheetDeep` | `rgba(12, 12, 14, 0.95)` | HojaInferior (Nuevo gasto) |
| `surfaceInput` | `rgba(31, 31, 31, 0.9)` | Campos de Login y Registro |
| `background60` | `rgba(19, 19, 19, 0.6)` | Velo del fondo de Login y Registro |
| `surfaceLow50` | `rgba(27, 27, 27, 0.5)` | Fila de gasto |
| `surfaceLow70` | `rgba(27, 27, 27, 0.7)` | Tarjeta de resumen |
| `surfaceLowest80` | `rgba(14, 14, 14, 0.8)` | Panel de Inicio |
| `surfaceHigh80` | `rgba(42, 42, 42, 0.8)` | Botones de ícono, ícono de Login y Registro |
| `surfaceBright40` | `rgba(57, 57, 57, 0.4)` | Monolito del fondo de Login y Registro |
| `scrim` | `rgba(0, 0, 0, 0.6)` | Velo detrás de paneles |
| `scrimSoft` | `rgba(0, 0, 0, 0.4)` | Velo detrás de HojaInferior |
| `navbar` | `rgba(24, 24, 27, 0.75)` | Capa de la barra flotante sobre el blur |

### Vidrio y bordes

| Token | Valor | Uso |
| --- | --- | --- |
| `glass04` / `glass05` / `glass07` / `glass08` | `rgba(255, 255, 255, 0.04…0.08)` | Superficies de vidrio |
| `border` | `rgba(255, 255, 255, 0.08)` | Borde sutil |
| `borderSoft` | `rgba(255, 255, 255, 0.05)` | white/5 |
| `borderStrong` | `rgba(255, 255, 255, 0.10)` | white/10 |
| `borderPressed` | `rgba(255, 255, 255, 0.20)` | Chip presionado |
| `borderTop` | `rgba(255, 255, 255, 0.08)` | Brillo superior de tarjetas, panel y hoja |
| `borderTopStrong` | `rgba(255, 255, 255, 0.12)` | Brillo superior de botones de ícono |
| `borderTopAvatar` | `rgba(255, 255, 255, 0.15)` | Brillo superior de Avatar |
| `outline` | `#8E9192` | outline |
| `outlineVariant` / `handle` | `#444748` | outline-variant, jalador |
| `outlineVariant30` | `rgba(68, 71, 72, 0.3)` | Borde del ícono de Login y Registro |
| `handleSheet` | `rgba(255, 255, 255, 0.3)` | Jalador de HojaInferior |

### Texto

| Token | Valor | Uso |
| --- | --- | --- |
| `text` | `#FFFFFF` | Texto principal |
| `onSurface` | `#E2E2E2` | on-surface |
| `textVariant` | `#C4C7C8` | on-surface-variant |
| `textSecondary` | `#A1A1AA` | zinc-400 |
| `textChip` | `#D4D4D8` | zinc-300 |
| `textMuted` | `#71717A` | zinc-500 |
| `textNav` | `#A3A3A3` | Pestañas inactivas |
| `textSoft` | `rgba(255, 255, 255, 0.9)` | Punto del teclado |
| `iconSoft` | `rgba(255, 255, 255, 0.8)` | Ícono de borrar del teclado |
| `amount` | `#E2E1EB` | Montos de egresos |
| `error` | `#FFB4AB` | Errores de formulario |

### Acciones y sombras

| Token | Valor | Uso |
| --- | --- | --- |
| `primary` | `#FFFFFF` | Botón principal, pestaña activa |
| `primaryFixedDim` | `#C6C6C7` | primary-fixed-dim |
| `primary40` | `rgba(255, 255, 255, 0.4)` | Punto de SelectorMes |
| `onPrimary` | `#000000` | Texto sobre `primary` |
| `onPrimaryMuted` | `#2F3131` | Texto del botón de Login y Registro |
| `sombra` | `#000000` | `shadowColor` de sombras |
| `brillo` | `#FFFFFF` | `shadowColor` del halo blanco de botones y chips |

## Acento

| Token | Valor | Uso |
| --- | --- | --- |
| `acento` | `#8B5CF6` | Color de marca (violeta). Cursor y selección del campo de nota en Nuevo gasto. |
| `acentoTexto` | `#C4B5FD` | Acento para texto sobre fondo oscuro (violeta claro). Saludo "Hola, {nombre}" de Inicio. |

El acento se usa de forma discreta: no cambia botones, la pestaña activa, el botón `+`, chips, fondos
ni sombras.

## Semánticos

Estado financiero. Cada uno tiene una variante `Suave` al ~15% para fondos de barras de progreso y avisos.

| Token | Valor | Variante suave | Uso |
| --- | --- | --- | --- |
| `exito` | `#10B981` | `exitoSuave` · `rgba(16, 185, 129, 0.15)` | En meta, ingresos |
| `aviso` | `#FF9F0A` | `avisoSuave` · `rgba(255, 159, 10, 0.15)` | Cerca del límite |
| `alerta` | `#FF453A` | `alertaSuave` · `rgba(255, 69, 58, 0.15)` | Límite excedido |

`alerta` (estado financiero) es distinto de `error` (validación de formularios) y del coral de Comida.

## Categorías

La clave es el nombre exacto del seed (`backend/migrations/007_seed_categorias.sql`). Una categoría
que no esté en la tabla usa el color de Otros.

| Categoría (seed) | Color |
| --- | --- |
| Comida | `#FF3B69` |
| Transporte | `#4F7FFF` |
| Entretenimiento | `#7C3AED` |
| Servicios | `#00C288` |
| Salud | `#F472B6` |
| Otros | `#8E8E93` |

Regla del brief para chips: seleccionado → fondo sólido del color de la categoría con texto e ícono
blancos; no seleccionado → superficie neutra con un micro-punto del color de la categoría.

Aplicar los colores de categoría en pantallas corresponde a HU-33, HU-35 y HU-37.

## Pendiente: tema claro

Solo documentado, **no implementado** (no existe `temas.claro` ni se usa `useColorScheme`).
Valores del brief (*Opalescent Glow*):

| Rol | Valor |
| --- | --- |
| Fondo base | `#FAF8FF` |
| Brillo celeste | `rgba(147, 197, 253, 0.55)` |
| Brillo lavanda | `rgba(196, 181, 253, 0.45)` |
| Texto principal | `#111114` |
| Texto secundario | `#5B6585` |
| Chip no seleccionado | `#F4F4F7` |
| Pestaña activa de la barra | `#111114` con texto e ícono invertidos |

Cuando se implemente, `temas.claro` debe tener las mismas claves que `temas.oscuro`.
