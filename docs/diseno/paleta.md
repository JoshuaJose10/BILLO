# Paleta de colores de Billo

Fuente de verdad: [project-brief-luminal-glow.md](stitch-paleta/project-brief-luminal-glow.md) y las
capturas de `stitch-paleta/*/screen.png`. Cualquier `DESIGN.md` de "Obsidian Luminescence" que pida
una paleta *strictly achromatic* está obsoleto: Luminal Glow agrega acento, semánticos y categorías
sobre la misma base neutra.

En código:

- Base, acento y semánticos: `mobile/src/theme/colors.js` (`temas.oscuro` y `temas.claro`).
- Tema activo: `useTema()` de `mobile/src/theme/TemaContext.js` (`{ colors, esOscuro }`), que sigue
  el modo del sistema (`useColorScheme`) y se actualiza en vivo.
- Categorías: `mobile/src/theme/categorias.js` (`colorCategoria(nombre, esOscuro)`).

Ninguna pantalla ni componente debe usar un `#hex` o `rgba(` suelto; todo color sale de un token, y
ningún archivo fuera de `theme/` importa un tema fijo. Para comprobarlo:

```sh
git grep -nE "#[0-9A-Fa-f]{3,8}\b|rgba?\(" -- mobile/src ':!mobile/src/theme'
git grep -n "import { colors" -- mobile/src ':!mobile/src/theme'
npm run verificar:temas   # desde mobile/: claro y oscuro tienen las mismas claves
```

Las secciones siguientes describen el **tema oscuro**; el claro está en [Tema claro](#tema-claro).

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
| `textoSobreColor` | `#FFFFFF` | Glifo de `IconoCategoria` y texto del chip de categoría seleccionado (blanco en ambos temas) |

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
| `acento` | `#8B5CF6` | Color de marca (violeta). Cursor y selección de la nota, borde de foco de Input, borde de ChipSelector y SelectorMes al presionar, borde y halo del chip "Todas" seleccionado. |
| `acentoTexto` | `#C4B5FD` | Acento para texto sobre fondo oscuro (violeta claro). Saludo de Inicio, enlaces de Login y Registro (EnlaceAuth), texto e ícono del chip "Todas" seleccionado. |
| `acentoSuave` | `rgba(139, 92, 246, 0.15)` | Fondo de chips y botones activos con acento. |

El acento se usa de forma discreta: no cambia Boton (blanco/negro), la pestaña activa ni el botón `+`
de la barra flotante. Con el acento sólido de fondo ningún texto llega a 4.5:1 (blanco 4.23, `#111114`
4.45), por eso los estados activos usan `acentoSuave` + borde `acento` + texto `acentoTexto`. El chip
"Todas" tampoco usa un acento profundo: el que llega a 4.5:1 (`#8452F5`) es casi igual al violeta de
Entretenimiento (`#7C3AED`) y "Todas" se leería como una categoría.

## Brillo del fondo

`FondoDegradado` pinta dos halos radiales (react-native-svg) en toda la pantalla, encima de
`background`: índigo con centro en (15%, 0%) y radio del 95% del ancho, y violeta con centro en
(90%, 5%) y radio del 90% del ancho. Se usa en Inicio, Movimientos y, sobre el velo de `FondoAuth`,
en Login y Registro.

| Token | Valor | Uso |
| --- | --- | --- |
| `brilloIndigo` | `rgba(79, 70, 229, 0.35)` | Halo índigo (brief) |
| `brilloVioleta` | `rgba(124, 58, 237, 0.25)` | Halo violeta (brief) |

El último stop de cada halo es el mismo color con `stopOpacity` 0: se desvanece en su propio tono (no
pasa por gris) y llega a 0 dentro del círculo, así que no queda ningún borde visible. Las medidas van en
píxeles (`userSpaceOnUse`) para que el círculo no se deforme con la proporción de la pantalla.

## Semánticos

Estado financiero. Cada uno tiene una variante `Suave` al ~15% para fondos de barras de progreso y avisos.

| Token | Valor | Variante suave | Uso |
| --- | --- | --- | --- |
| `exito` | `#10B981` | `exitoSuave` · `rgba(16, 185, 129, 0.15)` | En meta, ingresos |
| `aviso` | `#FF9F0A` | `avisoSuave` · `rgba(255, 159, 10, 0.15)` | Cerca del límite |
| `alerta` | `#FF453A` | `alertaSuave` · `rgba(255, 69, 58, 0.15)` | Límite excedido |

`alerta` también es el color de los errores en pantalla: textos de error de Input, Login, Registro y
Nuevo gasto, aviso de error de Inicio y bordes de error de Input, MontoGrande y ChipCategoria.

## Categorías

En `theme/categorias.js`. La clave es el nombre del seed
(`backend/migrations/007_seed_categorias.sql`); se busca sin espacios a los lados y sin distinguir
mayúsculas (`" comida "` → Comida). Una categoría que no esté en la tabla (personalizada, renombrada,
`null`) usa los valores de Otros.

- `colorCategoria(nombre, esOscuro)`: color base vivo (micro-punto, halo del chip, sombra del
  ícono). En tema claro devuelve `baseClaro` (ver [Categorías en tema claro](#categorías-en-tema-claro)).
- `fondoChipCategoria(nombre)`: el mismo tono más oscuro (solo baja la luminosidad HSL) hasta dar
  ≥ 4.5:1 con texto blanco. Es el fondo del chip seleccionado.
- `degradadoCategoria(nombre)`: `[claro, centro, oscuro]` para el degradado diagonal de
  `IconoCategoria`. En general claro = 25% hacia blanco, centro = base y oscuro = 25% hacia negro.

`fondoChipCategoria` y `degradadoCategoria` son iguales en ambos temas: lo que va encima (texto del
chip, glifo del ícono) es blanco (`textoSobreColor`) en los dos.

### Chip seleccionado (texto blanco)

| Categoría (seed) | Base | Blanco sobre base | Fondo de chip | Blanco sobre fondo |
| --- | --- | --- | --- | --- |
| Comida | `#FF3B69` | 3.45 | `#EA0037` | 4.61 |
| Transporte | `#4F7FFF` | 3.61 | `#2F68FF` | 4.62 |
| Entretenimiento | `#7C3AED` | 5.70 | `#7C3AED` (igual) | 5.70 |
| Servicios | `#00C288` | 2.31 | `#00855D` | 4.65 |
| Salud | `#F472B6` | 2.65 | `#E0117E` | 4.61 |
| Otros | `#8E8E93` | 3.26 | `#74747A` | 4.64 |

### Ícono (glifo blanco sobre el degradado)

El glifo de 20px ocupa la parte central de la diagonal del squircle de 40px: el contraste se mide en
el 25%, 50% y 75% del degradado. La meta para íconos es 3:1. En Servicios y Salud el final ya pasaba
(3.96 y 4.46); lo que fallaba era el centro, así que se oscurecieron el centro y el claro, sin cambiar
el tono.

| Categoría | Degradado (claro · centro · oscuro) | Glifo 25% / 50% / 75% | Glifo vs final |
| --- | --- | --- | --- |
| Comida | `#FF6C8F` · `#FF3B69` · `#BF2C4F` | 3.09 / 3.45 / 4.40 | 5.69 |
| Transporte | `#7B9FFF` · `#4F7FFF` · `#3B5FBF` | 3.03 / 3.61 / 4.57 | 5.87 |
| Entretenimiento | `#9D6BF2` · `#7C3AED` · `#5D2CB2` | 4.57 / 5.70 / 6.95 | 8.51 |
| Servicios | `#00C288` · `#00A876` · `#009266` | 2.65 / 3.06 / 3.47 | 3.96 |
| Salud | `#F472B6` · `#F25EAC` · `#B75689` | 2.83 / 3.01 / 3.65 | 4.46 |
| Otros | `#AAAAAE` · `#8E8E93` · `#6B6B6E` | 2.73 / 3.26 / 4.13 | 5.31 |

Antes del ajuste, Servicios daba 2.12 / 2.31 / 2.99 y Salud 2.35 / 2.65 / 3.40.

### Dónde se aplican

- **`IconoCategoria`** (filas de gasto de Inicio y Movimientos): squircle de 40px con el degradado,
  reflejo blanco arriba (`brilloIcono` → `brilloIconoFin`), glifo blanco y sombra del color base.
- **`ChipCategoria`**: seleccionado → fondo `fondoChipCategoria`, texto e ícono blancos y halo del
  color base; no seleccionado → superficie neutra con micro-punto de 6px del color base. El chip
  "Todas" (con `icono` propio) no lleva punto y, seleccionado, usa el acento translúcido.
- **`TarjetaResumen`** (Inicio): micro-punto de 6px del color base en cada chip de categoría.

| Token | Valor | Uso |
| --- | --- | --- |
| `brilloIcono` | `rgba(255, 255, 255, 0.22)` | Reflejo superior de `IconoCategoria` |
| `brilloIconoFin` | `rgba(255, 255, 255, 0)` | Final del reflejo |

## Contraste de texto (tema oscuro)

Fondos: `background`; la hoja de Nuevo gasto (`sheetDeep`); una fila de gasto dentro del panel de
Inicio; y el pico del brillo índigo (`brilloIndigo` pleno sobre `background`, peor caso arriba a la
izquierda).

| Token | Valor | background | hoja | fila | pico del brillo |
| --- | --- | --- | --- | --- | --- |
| `text` | `#FFFFFF` | 18.58 | 19.66 | 18.26 | 13.91 |
| `onSurface` | `#E2E2E2` | 14.34 | 15.18 | 14.10 | 10.74 |
| `textVariant` | `#C4C7C8` | 10.93 | 11.57 | 10.74 | 8.18 |
| `textSecondary` | `#A1A1AA` | 7.25 | 7.67 | 7.13 | 5.43 |
| `textChip` | `#D4D4D8` | 12.57 | 13.30 | 12.36 | 9.41 |
| `outline` | `#8E9192` | 5.85 | 6.19 | 5.75 | 4.38 |
| `textNav` | `#A3A3A3` | 7.37 | 7.80 | 7.24 | 5.52 |
| `amount` | `#E2E1EB` | 14.34 | 15.17 | 14.09 | 10.74 |
| `acentoTexto` | `#C4B5FD` | 10.06 | 10.65 | 9.89 | 7.54 |
| `alerta` | `#FF453A` | 5.45 | 5.77 | 5.36 | 4.08 |

`outline` y `alerta` no se usan arriba de la pantalla, donde está el pico del brillo.
`onPrimary` sobre `primary`: 21.00; `onPrimaryMuted` sobre `primary`: 13.09.

## Tema claro

*Opalescent Glow* del brief. Fuentes: `stitch-paleta/07_inicio_claro_color_fondo_1`,
`13_cartera_subs_claro_brillo`, `14_cartera_tarjetas_oscuro_gradiente_claro_fondo` y
`project-brief-luminal-glow.md`. `temas.claro` tiene exactamente las mismas claves que
`temas.oscuro` (`npm run verificar:temas`); cada clave cumple el mismo papel en los dos temas.

Reglas:

- Fondo lila muy claro, tarjetas y paneles blancos, filas internas `#F8F8FA`, pastillas `#F0F0F4` y
  bordes `#E7E7EC`.
- El botón principal, el `+` y la pestaña activa se invierten: `primary` es `#111114` y `onPrimary`
  blanco.
- El vidrio y los velos translúcidos usan negro (`rgba(17, 17, 20, …)`) de baja opacidad en vez de
  blanco. El brillo superior (`borderTop`) sigue siendo blanco.
- Sombras suaves: `sombra` es negro al 15% y su alfa se multiplica por el `shadowOpacity` de cada
  estilo, así que las sombras quedan entre 1.5% y 13.5% (Stitch usa 3–4% en tarjetas). `brillo` (halo
  de botones) pasa a ser oscuro: un halo blanco no se vería sobre fondo claro.
- El ícono de categoría y el chip seleccionado no cambian: degradado vivo y blanco encima.

### Superficies

| Token | Valor | Uso |
| --- | --- | --- |
| `background` | `#FAF8FF` | Fondo de pantalla |
| `surfaceLowest` | `#FFFFFF` | Tarjetas y paneles |
| `surfaceLow` | `#F8F8FA` | Filas internas, SelectorMes |
| `surface` | `#F4F4F7` | Panel de hoja (método, fecha, nota) |
| `surfaceHigh` | `#F0F0F4` | Avatar, pastillas, campo enfocado |
| `surfaceHighest` | `#E8E8EE` | Jalador del panel de Inicio |
| `surfaceBright` | `#E2E2EA` | Barra de fuerza de contraseña apagada |
| `surfaceChip` | `#F8F8FA` | Chips de la tarjeta de resumen |
| `card` | `#FFFFFF` | Campo de la nota |
| `sheet` / `sheetDeep` | `rgba(255, 255, 255, 0.95)` | Hojas de Login/Registro y HojaInferior |
| `surfaceInput` | `rgba(240, 240, 244, 0.9)` | Campos de Login y Registro |
| `background60` | `rgba(250, 248, 255, 0.6)` | Velo del fondo de Login y Registro |
| `surfaceLow50` | `rgba(240, 240, 244, 0.5)` | Fila de gasto (≈ `#F8F8FA` sobre blanco) |
| `surfaceLow70` | `rgba(255, 255, 255, 0.85)` | Tarjeta de resumen |
| `surfaceLowest80` | `rgba(255, 255, 255, 0.85)` | Panel de Inicio |
| `surfaceHigh80` | `rgba(255, 255, 255, 0.8)` | Ícono de Login y Registro |
| `surfaceBright40` | `rgba(226, 226, 234, 0.4)` | Monolito del fondo de Registro |
| `scrim` | `rgba(17, 17, 20, 0.25)` | Velo detrás de paneles |
| `scrimSoft` | `rgba(17, 17, 20, 0.15)` | Velo detrás de HojaInferior |
| `navbar` | `rgba(255, 255, 255, 0.85)` | Capa de la barra flotante sobre el blur |

### Vidrio y bordes

| Token | Valor | Uso |
| --- | --- | --- |
| `glass04` / `glass05` | `rgba(17, 17, 20, 0.04)` | Teclas, monto, chips |
| `glass07` | `rgba(17, 17, 20, 0.05)` | Botón secundario, botón de cerrar, aviso de Login |
| `glass08` | `rgba(17, 17, 20, 0.08)` | Tecla presionada |
| `border` | `#E7E7EC` | Borde sutil |
| `borderSoft` | `#ECECF1` | Borde de teclas |
| `borderStrong` | `#E2E2EA` | Chips, navbar, botón secundario |
| `borderPressed` | `#C9C9D2` | Chip presionado |
| `borderTop` | `rgba(255, 255, 255, 0.9)` | Brillo superior de tarjetas, panel y hoja |
| `borderTopStrong` / `borderTopAvatar` | `#FFFFFF` | Brillo superior de botones de ícono y Avatar |
| `outline` | `#71717C` | Placeholders, íconos de Input, total del día, pista de contraseña |
| `outlineVariant` | `#C9C9D2` | Jalador de Login y Registro |
| `outlineVariant30` | `rgba(17, 17, 20, 0.08)` | Borde del ícono de Login y Registro |
| `handle` | `#E7E7EC` | Jalador |
| `handleSheet` | `rgba(17, 17, 20, 0.15)` | Jalador de HojaInferior |

### Texto

| Token | Valor | Uso |
| --- | --- | --- |
| `text` | `#111114` | Texto principal |
| `onSurface` | `#1F1F24` | on-surface |
| `textVariant` | `#52525E` | Subtítulos, etiquetas en mayúsculas |
| `textSecondary` | `#6B6B76` | Texto secundario (Stitch claro) |
| `textChip` | `#3F3F48` | Texto de chips |
| `textMuted` | `#8E8E99` | Sin uso por ahora |
| `textNav` | `#5E5E69` | Pestañas inactivas, lema de Login y Registro |
| `textSoft` | `rgba(17, 17, 20, 0.9)` | Punto del teclado |
| `iconSoft` | `rgba(17, 17, 20, 0.8)` | Ícono de borrar del teclado |
| `amount` | `#111114` | Montos de egresos (carbón del brief) |
| `textoSobreColor` | `#FFFFFF` | Glifo del ícono y texto del chip de categoría seleccionado |

`textSecondary` reemplaza el `#5B6585` que estaba anotado antes en este documento: es el gris que usan
todas las pantallas claras de Stitch.

### Acciones, sombras y acento

| Token | Valor | Uso |
| --- | --- | --- |
| `primary` | `#111114` | Botón principal, `+`, pestaña activa |
| `primaryFixedDim` | `#3A3A42` | Figura decorativa del fondo de Registro |
| `primary40` | `rgba(17, 17, 20, 0.4)` | Punto de SelectorMes |
| `onPrimary` | `#FFFFFF` | Texto e ícono sobre `primary` |
| `onPrimaryMuted` | `#F0F0F4` | Texto del botón de Login y Registro |
| `sombra` | `rgba(17, 17, 20, 0.15)` | `shadowColor` de sombras |
| `brillo` | `#111114` | `shadowColor` del halo de botones |
| `acento` | `#8A55F0` | Bordes de foco y de estados activos (4.53:1 sobre blanco) |
| `acentoTexto` | `#622CD6` | Saludo de Inicio, enlaces de Login y Registro, chip "Todas" |
| `acentoSuave` | `rgba(138, 85, 240, 0.12)` | Fondo de chips y botones activos con acento |

`acentoTexto` es más profundo que el `#8A55F0` de Stitch (4.30:1 sobre `background`) para pasar
4.5:1 también encima del brillo, donde está el saludo de Inicio.

### Brillo del fondo y semánticos

| Token | Valor | Uso |
| --- | --- | --- |
| `brilloIndigo` | `rgba(147, 197, 253, 0.55)` | Halo celeste (mismo lugar que el índigo del oscuro) |
| `brilloVioleta` | `rgba(196, 181, 253, 0.45)` | Halo lavanda (mismo lugar que el violeta del oscuro) |
| `brilloIcono` / `brilloIconoFin` | `rgba(255, 255, 255, 0.22)` → `0` | Reflejo del ícono de categoría |
| `exito` | `#22A866` | En meta, ingresos (3.06:1 sobre blanco) |
| `exitoSuave` | `rgba(34, 168, 102, 0.12)` | |
| `aviso` | `#D97706` | Cerca del límite (3.19:1 sobre blanco) |
| `avisoSuave` | `rgba(217, 119, 6, 0.12)` | |
| `alerta` | `#D92D20` | Límite excedido y errores (4.83:1 sobre blanco) |
| `alertaSuave` | `rgba(217, 45, 32, 0.12)` | |

`alerta` llega a 4.5:1 y no solo a 3:1 porque también es el color de los textos de error. El `#FF453A`
del oscuro da 3.41:1 sobre blanco.

### Contraste de texto (tema claro)

Fondos: `background`, tarjeta blanca, fila de gasto (`surfaceLow50` sobre blanco), pastilla
(`surfaceHigh`) y el pico del brillo (celeste y lavanda plenos encimados, peor caso).

| Token | Valor | background | tarjeta | fila | pastilla | pico del brillo |
| --- | --- | --- | --- | --- | --- | --- |
| `text` | `#111114` | 17.89 | 18.85 | 17.77 | 16.58 | 11.82 |
| `onSurface` | `#1F1F24` | 15.58 | 16.41 | 15.47 | 14.44 | 10.29 |
| `textVariant` | `#52525E` | 7.31 | 7.70 | 7.26 | 6.77 | 4.83 |
| `textSecondary` | `#6B6B76` | 5.00 | 5.26 | 4.96 | 4.63 | 3.30 |
| `textChip` | `#3F3F48` | 9.89 | 10.42 | 9.82 | 9.16 | 6.53 |
| `outline` | `#71717C` | 4.58 | 4.82 | 4.55 | 4.24 | 3.02 |
| `textNav` | `#5E5E69` | 6.08 | 6.40 | 6.03 | 5.63 | 4.02 |
| `amount` | `#111114` | 17.89 | 18.85 | 17.77 | 16.58 | 11.82 |
| `acentoTexto` | `#622CD6` | 6.99 | 7.37 | 6.95 | 6.48 | 4.62 |
| `alerta` | `#D92D20` | 4.59 | 4.83 | 4.56 | 4.25 | 3.03 |

Arriba de la pantalla, donde está el brillo, solo hay `text`, `textVariant` (etiqueta "Bienvenido de
nuevo") y `acentoTexto` (saludo), que pasan 4.5:1 en el peor caso. El lema de Login y Registro
(`textNav`) queda a media altura, donde el brillo es más tenue: 5.12:1. `onPrimary` sobre `primary`:
18.85; `onPrimaryMuted` sobre `primary`: 16.58.

### Categorías en tema claro

El micro-punto es un elemento gráfico: la meta es 3:1 contra el chip claro (`glass05` sobre la hoja
blanca ≈ `#F5F5F6`) y contra el chip de la tarjeta de resumen (`#F8F8FA`). Donde el color vivo no
llega, `baseClaro` usa un tono más profundo (los de Stitch claro). El halo del chip seleccionado y la
sombra del ícono también usan `baseClaro`.

| Categoría | `base` (oscuro) | Vivo sobre chip claro | `baseClaro` | Sobre chip claro | Sobre chip de tarjeta |
| --- | --- | --- | --- | --- | --- |
| Comida | `#FF3B69` | 3.17 | `#FF3B69` (igual) | 3.17 | 3.26 |
| Transporte | `#4F7FFF` | 3.32 | `#3866F0` | 4.45 | 4.58 |
| Entretenimiento | `#7C3AED` | 5.23 | `#7C3AED` (igual) | 5.23 | 5.37 |
| Servicios | `#00C288` | 2.12 | `#1E9A5D` | 3.30 | 3.39 |
| Salud | `#F472B6` | 2.43 | `#EB4778` | 3.38 | 3.47 |
| Otros | `#8E8E93` | 2.99 | `#7C7C82` | 3.81 | 3.91 |

Transporte pasaba con el vivo, pero se usa el `#3866F0` de Stitch para que el azul no se vea lavado
sobre blanco. Servicios usa `#1E9A5D` y no el `#22A866` de Stitch porque este da 2.81:1.
`fondoChip` y el degradado del ícono no cambian (texto y glifo blancos).
