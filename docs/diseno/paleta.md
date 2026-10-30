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

Neutros de Obsidian Luminescence. Los sufijos numéricos (`surfaceHigh80`, `glass05`…) son la opacidad,
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
| `sheetDeep` | `rgba(12, 12, 14, 0.95)` | HojaInferior (Nuevo gasto, Perfil) |
| `tinteHoja` → `tinteHojaFin` | `rgba(99, 70, 229, 0.22)` → `0` | Tinte índigo arriba de HojaInferior, 180 px |
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
| `glass05` / `glass07` | `rgba(255, 255, 255, 0.05 / 0.07)` | Superficies de vidrio (chips, botones) |
| `border` | `rgba(255, 255, 255, 0.08)` | Borde sutil |
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
| `acentoTexto` | `#C4B5FD` | Acento para texto sobre fondo oscuro (violeta claro). Enlaces de Login y Registro (EnlaceAuth), texto e ícono del chip "Todas" seleccionado. |
| `acentoSuave` | `rgba(139, 92, 246, 0.15)` | Fondo de chips y botones activos con acento. |

El acento se usa de forma discreta: no cambia Boton (blanco/negro), la pestaña activa ni el botón `+`
de la barra flotante. Con el acento sólido de fondo ningún texto llega a 4.5:1 (blanco 4.23, `#111114`
4.45), por eso los estados activos usan `acentoSuave` + borde `acento` + texto `acentoTexto`. El chip
"Todas" tampoco usa un acento profundo: el que llega a 4.5:1 (`#8452F5`) es casi igual al violeta de
Entretenimiento (`#7C3AED`) y "Todas" se leería como una categoría.

## Brillo del fondo

`FondoDegradado` traduce a react-native-svg los `radial-gradient` del fondo de Inicio en Stitch
(`07_inicio_oscuro_gradiente_fondo_1/code.html`). Las capas viven en el token `fondoCapas` de cada
tema, de abajo hacia arriba (en CSS se escriben al revés). Se usa en Inicio, Movimientos y, sobre el
velo de `FondoAuth`, en Login y Registro.

| Capa (CSS) | Centro | Radio | Color → transparente |
| --- | --- | --- | --- |
| `circle 420px at 50% 0%` | (50%, 0%) | 420 px | `rgba(76, 53, 222, 0.28)` → 0 en 75% |
| `circle 300px at 85% 10%` | (85%, 10%) | 300 px | `rgba(130, 60, 255, 0.22)` → 0 en 70% |
| `circle 260px at 15% 15%` | (15%, 15%) | 260 px | `rgba(45, 95, 255, 0.20)` → 0 en 70% |

Formato de cada capa: `x`/`y` en fracción del ancho y del alto; `rx`/`ry` en px o como `{ ancho }` /
`{ alto }` (los porcentajes de CSS); `stops` con `offset`, `color` y `opacity` opcional. El
`transparent` de CSS se escribe como el mismo color con `opacity: 0`: así se desvanece en su propio
tono (CSS interpola premultiplicado; SVG no) y no pasa por gris. Las medidas van en píxeles
(`userSpaceOnUse`) para que el círculo no se deforme.

Encima del brillo van el saludo de Inicio y el lema de Login y Registro, con tokens propios:

| Token | Valor | Uso |
| --- | --- | --- |
| `saludo` | `#C4B5FD` (= `acentoTexto`) | "Hola, Fer" en Inicio |
| `saludoEtiqueta` | `#C4C7C8` (= `textVariant`) | "Bienvenido de nuevo" |
| `lema` | `#A3A3A3` (= `textNav`) | Lema de Login y Registro |

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
Inicio; y el pico del brillo (las tres capas plenas encimadas sobre `background` = `#372C8C`, peor
caso; en la pantalla real nunca coinciden los tres centros).

| Token | Valor | background | hoja | fila | pico del brillo |
| --- | --- | --- | --- | --- | --- |
| `text` | `#FFFFFF` | 18.58 | 19.66 | 18.26 | 11.04 |
| `saludo` | `#C4B5FD` | 10.06 | 10.65 | 9.89 | 5.98 |
| `saludoEtiqueta` | `#C4C7C8` | 10.93 | 11.57 | 10.74 | 6.50 |
| `lema` | `#A3A3A3` | 7.37 | 7.80 | 7.24 | 4.38 |
| `onSurface` | `#E2E2E2` | 14.34 | 15.18 | 14.10 | 8.53 |
| `textVariant` | `#C4C7C8` | 10.93 | 11.57 | 10.74 | 6.50 |
| `textSecondary` | `#A1A1AA` | 7.25 | 7.67 | 7.13 | 4.31 |
| `textChip` | `#D4D4D8` | 12.57 | 13.30 | 12.36 | 7.47 |
| `outline` | `#8E9192` | 5.85 | 6.19 | 5.75 | 3.48 |
| `textNav` | `#A3A3A3` | 7.37 | 7.80 | 7.24 | 4.38 |
| `amount` | `#E2E1EB` | 14.34 | 15.17 | 14.09 | 8.52 |
| `acentoTexto` | `#C4B5FD` | 10.06 | 10.65 | 9.89 | 5.98 |
| `alerta` | `#FF453A` | 5.45 | 5.77 | 5.36 | 3.24 |

`outline`, `textSecondary` y `alerta` no se usan arriba de la pantalla. El lema de Login queda a
media altura (~200 px), donde la capa de 420 px ya bajó a ~10% de opacidad, no en el pico.
`onPrimary` sobre `primary`: 21.00; `onPrimaryMuted` sobre `primary`: 13.09.

## Tema claro

*Opalescent Glow* del brief. Fuentes: `stitch-paleta/07_inicio_claro_color_fondo_1`,
`13_cartera_subs_claro_brillo`, `14_cartera_tarjetas_oscuro_gradiente_claro_fondo` y
`project-brief-luminal-glow.md`. `temas.claro` tiene exactamente las mismas claves que
`temas.oscuro` (`npm run verificar:temas`); cada clave cumple el mismo papel en los dos temas.

Reglas:

- Fondo `#F1F0FA` (el de Stitch), tarjetas y paneles blancos, filas internas `#F8F8FA`, pastillas `#F0F0F4` y
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
| `background` | `#F1F0FA` | Fondo de pantalla (Stitch claro) |
| `surfaceLowest` | `#FFFFFF` | Tarjetas y paneles |
| `surfaceLow` | `#F8F8FA` | Filas internas, SelectorMes |
| `surface` | `#F4F4F7` | Panel de hoja (método, fecha, nota) |
| `surfaceHigh` | `#F0F0F4` | Avatar, pastillas, campo enfocado |
| `surfaceHighest` | `#E8E8EE` | Jalador del panel de Inicio |
| `surfaceBright` | `#E2E2EA` | Barra de fuerza de contraseña apagada |
| `surfaceChip` | `#F8F8FA` | Chips de la tarjeta de resumen |
| `card` | `#FFFFFF` | Campo de la nota |
| `sheet` | `rgba(255, 255, 255, 0.95)` | Hoja de Login y Registro |
| `sheetDeep` | `#F4F2FC` | HojaInferior: lavanda claro, no blanco (08_nuevo_gasto) |
| `tinteHoja` → `tinteHojaFin` | `rgba(196, 181, 253, 0.55)` → `0` | Tinte lavanda arriba de HojaInferior |
| `surfaceInput` | `rgba(240, 240, 244, 0.9)` | Campos de Login y Registro |
| `background60` | `rgba(241, 240, 250, 0.6)` | Velo del fondo de Login y Registro |
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
| `glass05` | `#FFFFFF` | Chips y botones pequeños: blancos sobre la hoja lavanda |
| `glass07` | `rgba(17, 17, 20, 0.05)` | Botón secundario, botón de cerrar, aviso de Login |
| `border` | `#E7E7EC` | Borde sutil |
| `borderStrong` | `#E2E2EA` | Chips, navbar, botón secundario |
| `borderPressed` | `#C9C9D2` | Chip presionado |
| `borderTop` | `rgba(255, 255, 255, 0.9)` | Brillo superior de tarjetas, panel y hoja |
| `borderTopStrong` / `borderTopAvatar` | `#FFFFFF` | Brillo superior de botones de ícono y Avatar |
| `outline` | `#666671` | Placeholders, íconos de Input, total del día, pista de contraseña |
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
| `textNav` | `#6B6B76` | Pestañas inactivas (Stitch claro) |
| `saludo` | `#111114` | "Hola, Fer" en Inicio (carbón, como en Stitch) |
| `saludoEtiqueta` | `#3F3F48` | "Bienvenido de nuevo", encima del brillo |
| `lema` | `#3F3F48` | Lema de Login y Registro, encima del brillo |
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
| `acentoTexto` | `#5B25CF` | Enlaces de Login y Registro, chip "Todas" |
| `acentoSuave` | `rgba(138, 85, 240, 0.12)` | Fondo de chips y botones activos con acento |

`acentoTexto` es más profundo que el `#8A55F0` de Stitch para pasar 4.5:1 en el chip "Todas" de
Movimientos, que queda encima del brillo (4.78:1).

### Brillo del fondo y semánticos

`fondoCapas` del claro son los de `07_inicio_claro_color_fondo_1/code.html`:

| Capa (CSS, de arriba hacia abajo) | Centro | Radios | Stops |
| --- | --- | --- | --- |
| `110% 55% at 50% 0%` | (50%, 0%) | 110% del ancho × 55% del alto | `#8FB0FF` 0% · `#B9A6FF` 38% · `rgba(241, 240, 250, 0.92)` 72% · `#F1F0FA` 100% |
| `70% 50% at 90% 90%` | (90%, 90%) | 70% del ancho × 50% del alto | `#E3C8FF` 0% → transparente en 70% |

La capa de arriba termina en `#F1F0FA` opaco, como en Stitch: fuera de su elipse pinta el color de
fondo y tapa a la de abajo (en Stitch tampoco se ve). En Login y Registro eso también tapa las
figuras difuminadas de `FondoAuth`.

| Token | Valor | Uso |
| --- | --- | --- |
| `brilloIcono` / `brilloIconoFin` | `rgba(255, 255, 255, 0.22)` → `0` | Reflejo del ícono de categoría |
| `exito` | `#22A866` | En meta, ingresos (3.06:1 sobre blanco) |
| `exitoSuave` | `rgba(34, 168, 102, 0.12)` | |
| `aviso` | `#D97706` | Cerca del límite (3.19:1 sobre blanco) |
| `avisoSuave` | `rgba(217, 119, 6, 0.12)` | |
| `alerta` | `#C8281C` | Límite excedido y errores (5.56:1 sobre blanco, 4.92 sobre `background`) |
| `alertaSuave` | `rgba(200, 40, 28, 0.12)` | |

`alerta` llega a 4.5:1 y no solo a 3:1 porque también es el color de los textos de error. El `#FF453A`
del oscuro da 3.41:1 sobre blanco.

### Contraste de texto (tema claro)

Fondos: `background`, tarjeta blanca, fila de gasto (`surfaceLow50` sobre blanco), pastilla
(`surfaceHigh`) y el pico del brillo (`#8FB0FF`, el centro de la capa de arriba).

| Token | Valor | background | tarjeta | fila | pastilla | pico `#8FB0FF` |
| --- | --- | --- | --- | --- | --- | --- |
| `text` | `#111114` | 16.68 | 18.85 | 17.77 | 16.58 | 8.82 |
| `saludo` | `#111114` | 16.68 | 18.85 | 17.77 | 16.58 | 8.82 |
| `saludoEtiqueta` | `#3F3F48` | 9.22 | 10.42 | 9.82 | 9.16 | 4.87 |
| `lema` | `#3F3F48` | 9.22 | 10.42 | 9.82 | 9.16 | 4.87 |
| `onSurface` | `#1F1F24` | 14.52 | 16.41 | 15.47 | 14.44 | 7.68 |
| `textVariant` | `#52525E` | 6.81 | 7.70 | 7.26 | 6.77 | 3.60 |
| `textSecondary` | `#6B6B76` | 4.66 | 5.26 | 4.96 | 4.63 | 2.46 |
| `textChip` | `#3F3F48` | 9.22 | 10.42 | 9.82 | 9.16 | 4.87 |
| `outline` | `#666671` | 5.02 | 5.67 | 5.35 | 4.99 | 2.65 |
| `textNav` | `#6B6B76` | 4.66 | 5.26 | 4.96 | 4.63 | 2.46 |
| `amount` | `#111114` | 16.68 | 18.85 | 17.77 | 16.58 | 8.82 |
| `acentoTexto` | `#5B25CF` | 7.12 | 8.04 | 7.58 | 7.08 | 3.76 |
| `alerta` | `#C8281C` | 4.92 | 5.56 | 5.24 | 4.89 | 2.60 |

En la zona del brillo solo hay texto en `text`, `saludo`, `saludoEtiqueta`, `lema` y `textChip`
(chips de Movimientos), y todos pasan 4.5:1 incluso en el pico. El chip "Todas" seleccionado
(`acentoTexto` sobre `acentoSuave`) queda más abajo, donde el fondo es ≈ `#D7CDFC`: 4.78:1. Los demás
tokens solo aparecen sobre tarjetas, hojas o la parte baja de la pantalla. `outline` y `alerta`
bajaron de tono porque con el fondo `#F1F0FA` quedaban en 4.27 y 4.28. `onPrimary` sobre
`primary`: 18.85; `onPrimaryMuted` sobre `primary`: 16.58.

### Categorías en tema claro

El micro-punto es un elemento gráfico: la meta es 3:1 contra el chip claro (`glass05`, blanco) y contra el chip de la tarjeta de resumen (`#F8F8FA`). Donde el color vivo no
llega, `baseClaro` usa un tono más profundo (los de Stitch claro). El halo del chip seleccionado y la
sombra del ícono también usan `baseClaro`.

| Categoría | `base` (oscuro) | Vivo sobre chip blanco | `baseClaro` | Sobre chip blanco | Sobre chip de tarjeta |
| --- | --- | --- | --- | --- | --- |
| Comida | `#FF3B69` | 3.45 | `#FF3B69` (igual) | 3.45 | 3.26 |
| Transporte | `#4F7FFF` | 3.61 | `#3866F0` | 4.85 | 4.58 |
| Entretenimiento | `#7C3AED` | 5.70 | `#7C3AED` (igual) | 5.70 | 5.37 |
| Servicios | `#00C288` | 2.31 | `#1E9A5D` | 3.60 | 3.39 |
| Salud | `#F472B6` | 2.65 | `#EB4778` | 3.68 | 3.47 |
| Otros | `#8E8E93` | 3.26 | `#7C7C82` | 4.15 | 3.91 |

Transporte pasaba con el vivo, pero se usa el `#3866F0` de Stitch para que el azul no se vea lavado
sobre blanco. Servicios usa `#1E9A5D` y no el `#22A866` de Stitch porque este da 2.89:1 sobre el
chip de la tarjeta de resumen.
`fondoChip` y el degradado del ícono no cambian (texto y glifo blancos).

## Hoja de Nuevo gasto

Referencia: `stitch-paleta/08_nuevo_gasto_referencia.png` (ambos temas). Fuera de alcance por ser
funciones y no colores: selector Gasto/Ingreso, botón de micrófono y tarjeta "Visa".

- **HojaInferior**: fondo `sheetDeep` con un tinte de 180 px arriba (`tinteHoja` → `tinteHojaFin`)
  que se funde con la hoja. En oscuro es índigo; en claro, lavanda sobre una hoja lavanda clara.
- **Tarjeta del importe** (`MontoGrande`): `montoFondo` + `montoBorde` y sombra (`sombra` al 30%,
  ≈ 4% en claro).
- **Halo del importe**: degradado radial del color de la categoría elegida (`colorCategoria`) detrás
  del número, con opacidad `haloImporteOpacidad` en el centro y 0 en el borde. Sin categoría no hay
  halo.
- **Teclas** (`TecladoNumerico`): `teclaFondo`, `teclaBorde` y `teclaPresionada`.
- **Chips**: el seleccionado ya era como la referencia (fondo `fondoChipCategoria`, texto blanco). En
  claro, los no seleccionados y los de método, fecha y nota son blancos (`glass05`).

| Token | Oscuro | Claro |
| --- | --- | --- |
| `montoFondo` | `rgba(124, 58, 237, 0.10)` (tinte violeta) | `#FFFFFF` |
| `montoBorde` | `rgba(167, 139, 250, 0.35)` (borde luminoso) | `#ECECF1` |
| `haloImporteOpacidad` | `0.28` | `0.18` |
| `teclaFondo` | `rgba(255, 255, 255, 0.06)` | `#FFFFFF` |
| `teclaBorde` | `rgba(255, 255, 255, 0.06)` | `#E7E7EC` |
| `teclaPresionada` | `rgba(255, 255, 255, 0.12)` | `#F0F0F4` |

Contraste en la hoja clara (`#F4F2FC`): `text` 17.01, `textChip` 9.40, `outline` 5.12, `alerta` 5.02,
`textSecondary` 4.75. Arriba, con el tinte pleno (≈ `#DAD0FD`), solo están el título (`text`, 12.94) y
el botón de cerrar. En oscuro el tinte pleno queda en ≈ `#1E183D`: `text` 16.76, `textChip` 11.34. La
tarjeta del importe oscura (≈ `#161023`) da 7.24 con `textSecondary` y las teclas (≈ `#1A1A1C`) 17.38
con `text`.
