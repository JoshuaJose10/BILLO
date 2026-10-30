// Tokens del sistema "Obsidian Luminescence" (docs/diseno/stitch/obsidian_luminescence y la
// configuración de Tailwind de las pantallas oscuras del export de Stitch), más el acento y los
// semánticos de "Luminal Glow" (docs/diseno/paleta.md). Los colores de categoría viven en
// theme/categorias.js.
// `claro` (Opalescent Glow, stitch-paleta/*_claro_*) tiene exactamente las mismas claves que
// `oscuro`: `npm run verificar:temas` falla si no coinciden. Los sufijos numéricos (background60,
// glass05...) describen la opacidad del valor oscuro; en claro la clave conserva el mismo papel.
export const temas = {
  oscuro: {
    // Superficies (escala surface-container de Obsidian)
    background: '#131313', // surface
    surfaceLowest: '#0E0E0E', // surface-container-lowest
    surfaceLow: '#1B1B1B', // surface-container-low
    surface: '#1F1F1F', // surface-container (inputs)
    surfaceHigh: '#2A2A2A', // surface-container-high (avatar, ícono de gasto, pastillas)
    surfaceHighest: '#353535', // surface-container-highest
    surfaceBright: '#393939', // surface-bright
    card: '#0E0E0E', // hojas inferiores (surface-container-lowest)
    sheet: 'rgba(14, 14, 14, 0.95)', // surface-container-lowest/95 (hoja de Login y Registro)
    sheetDeep: 'rgba(12, 12, 14, 0.95)', // HojaInferior (Nuevo gasto)
    tinteHoja: 'rgba(99, 70, 229, 0.22)', // tinte superior de HojaInferior (08_nuevo_gasto)
    tinteHojaFin: 'rgba(99, 70, 229, 0)',
    surfaceInput: 'rgba(31, 31, 31, 0.9)', // surface-container/90 (campos de Login y Registro)
    surfaceChip: '#1C1C1E', // chips de la tarjeta de resumen

    // Superficies translúcidas (sufijo = opacidad, como el /NN de Tailwind)
    background60: 'rgba(19, 19, 19, 0.6)', // velo del fondo de Login y Registro
    surfaceLow50: 'rgba(27, 27, 27, 0.5)', // fila de gasto
    filaOpaca: '#151515', // fila de gasto deslizable: surfaceLow50 compuesto sobre el panel de Inicio
    surfaceLow70: 'rgba(27, 27, 27, 0.7)', // tarjeta de resumen
    surfaceLowest80: 'rgba(14, 14, 14, 0.8)', // panel de Inicio
    surfaceHigh80: 'rgba(42, 42, 42, 0.8)', // botones de ícono e ícono de Login y Registro
    surfaceBright40: 'rgba(57, 57, 57, 0.4)', // monolito del fondo de Login y Registro

    // Velos detrás de hojas y paneles
    scrim: 'rgba(0, 0, 0, 0.6)',
    scrimSoft: 'rgba(0, 0, 0, 0.4)',

    // Vidrio: blancos translúcidos sobre fondo oscuro
    glass05: 'rgba(255, 255, 255, 0.05)',
    glass07: 'rgba(255, 255, 255, 0.07)',

    // Bordes
    border: 'rgba(255, 255, 255, 0.08)', // Border Subtle
    borderStrong: 'rgba(255, 255, 255, 0.10)', // white/10
    borderPressed: 'rgba(255, 255, 255, 0.20)', // white/20 (chip presionado)
    borderTop: 'rgba(255, 255, 255, 0.08)', // brillo superior de tarjetas, panel y hoja
    borderTopStrong: 'rgba(255, 255, 255, 0.12)', // brillo superior de botones de ícono
    borderTopAvatar: 'rgba(255, 255, 255, 0.15)', // brillo superior del avatar
    outline: '#8E9192',
    outlineVariant: '#444748',
    outlineVariant30: 'rgba(68, 71, 72, 0.3)', // outline-variant/30
    handle: '#444748',
    handleSheet: 'rgba(255, 255, 255, 0.3)', // jalador de HojaInferior

    // Texto
    text: '#FFFFFF', // primary
    onSurface: '#E2E2E2',
    textVariant: '#C4C7C8', // on-surface-variant
    textSecondary: '#A1A1AA', // zinc-400 / Tertiary Text
    textChip: '#D4D4D8', // zinc-300
    textMuted: '#71717A', // zinc-500 / Muted Text
    textNav: '#A3A3A3', // neutral-400 (pestañas inactivas)
    textSoft: 'rgba(255, 255, 255, 0.9)', // white/90 (punto del teclado)
    iconSoft: 'rgba(255, 255, 255, 0.8)', // white/80 (borrar del teclado)
    amount: '#E2E1EB', // secondary-fixed (montos de egresos)
    textoSobreColor: '#FFFFFF', // glifo y texto sobre un color sólido (ícono y chip de categoría)

    // Acciones
    primary: '#FFFFFF',
    primaryFixedDim: '#C6C6C7', // primary-fixed-dim
    primary40: 'rgba(255, 255, 255, 0.4)', // primary/40 (punto de SelectorMes)
    onPrimary: '#000000',
    onPrimaryMuted: '#2F3131', // on-primary de Obsidian (botón principal de Login y Registro)
    navbar: 'rgba(24, 24, 27, 0.75)', // #18181b/75

    // Sombras (shadowColor; la intensidad la da shadowOpacity)
    sombra: '#000000',
    brillo: '#FFFFFF', // halo blanco de botones y chips

    // Acento de marca (Luminal Glow)
    acento: '#8B5CF6',
    acentoTexto: '#C4B5FD', // acento para texto sobre fondo oscuro (violeta claro)
    acentoSuave: 'rgba(139, 92, 246, 0.15)', // fondo de chips y botones activos con acento

    // Nuevo gasto (08_nuevo_gasto_referencia): tarjeta del importe y teclas
    montoFondo: 'rgba(124, 58, 237, 0.10)',
    montoBorde: 'rgba(167, 139, 250, 0.35)',
    teclaFondo: 'rgba(255, 255, 255, 0.06)',
    teclaBorde: 'rgba(255, 255, 255, 0.06)',
    teclaPresionada: 'rgba(255, 255, 255, 0.12)',

    // Saludo de Inicio ("Hola, Fer") y su etiqueta "Bienvenido de nuevo", encima del brillo
    saludo: '#C4B5FD',
    saludoEtiqueta: '#C4C7C8',
    // Lema de Login y Registro, encima del brillo
    lema: '#A3A3A3',

    // Brillo del fondo (FondoDegradado): capas radiales de 07_inicio_oscuro_gradiente_fondo_1,
    // de abajo hacia arriba (en CSS van al revés). Cada capa: centro (x, y) en fracción del ancho
    // y del alto; radios rx/ry en px o como { ancho } / { alto } (fracción); stops con offset,
    // color y opacity opcional. "transparent" de CSS = el mismo color con opacity 0, para que no
    // pase por gris.
    fondoCapas: [
      {
        x: 0.15,
        y: 0.15,
        rx: 260,
        ry: 260,
        stops: [
          { offset: 0, color: 'rgba(45, 95, 255, 0.20)' },
          { offset: 0.7, color: 'rgba(45, 95, 255, 0.20)', opacity: 0 },
        ],
      },
      {
        x: 0.85,
        y: 0.1,
        rx: 300,
        ry: 300,
        stops: [
          { offset: 0, color: 'rgba(130, 60, 255, 0.22)' },
          { offset: 0.7, color: 'rgba(130, 60, 255, 0.22)', opacity: 0 },
        ],
      },
      {
        x: 0.5,
        y: 0,
        rx: 420,
        ry: 420,
        stops: [
          { offset: 0, color: 'rgba(76, 53, 222, 0.28)' },
          { offset: 0.75, color: 'rgba(76, 53, 222, 0.28)', opacity: 0 },
        ],
      },
    ],

    // Reflejo superior y sombra del ícono de categoría (IconoCategoria); el color de la sombra
    // es el de la categoría (sombraCategoria)
    brilloIcono: 'rgba(255, 255, 255, 0.22)',
    brilloIconoFin: 'rgba(255, 255, 255, 0)',
    iconoSombraOpacidad: 0.35,
    iconoSombraRadio: 8,
    iconoSombraY: 4,

    // Semánticos de estado financiero; la variante Suave (~15%) es para fondos de barras y avisos
    exito: '#10B981', // en meta / ingresos
    exitoSuave: 'rgba(16, 185, 129, 0.15)',
    aviso: '#FF9F0A', // cerca del límite
    avisoSuave: 'rgba(255, 159, 10, 0.15)',
    alerta: '#FF453A', // límite excedido
    alertaSuave: 'rgba(255, 69, 58, 0.15)',
    alertaSolido: '#D9302A', // fondo sólido con texto blanco (>= 4.5:1): acción Eliminar al deslizar
  },

  claro: {
    // Superficies: fondo lila muy claro, tarjetas blancas, filas y pastillas en grises fríos
    background: '#F1F0FA',
    surfaceLowest: '#FFFFFF', // tarjetas y paneles
    surfaceLow: '#F8F8FA', // filas internas
    surface: '#F4F4F7', // panel de hoja (superficie neutra del brief)
    surfaceHigh: '#F0F0F4', // avatar, pastillas, campo enfocado
    surfaceHighest: '#E8E8EE',
    surfaceBright: '#E2E2EA',
    card: '#FFFFFF',
    sheet: 'rgba(255, 255, 255, 0.95)',
    sheetDeep: '#F4F2FC', // hoja lavanda clara
    tinteHoja: 'rgba(196, 181, 253, 0.55)',
    tinteHojaFin: 'rgba(196, 181, 253, 0)',
    surfaceInput: 'rgba(240, 240, 244, 0.9)',
    surfaceChip: '#F8F8FA',

    // Superficies translúcidas
    background60: 'rgba(241, 240, 250, 0.6)',
    surfaceLow50: 'rgba(240, 240, 244, 0.5)', // sobre el panel blanco queda en #F8F8FA
    filaOpaca: '#F7F7F9',
    surfaceLow70: 'rgba(255, 255, 255, 0.85)',
    surfaceLowest80: 'rgba(255, 255, 255, 0.85)',
    surfaceHigh80: 'rgba(255, 255, 255, 0.8)',
    surfaceBright40: 'rgba(226, 226, 234, 0.4)',

    // Velos
    scrim: 'rgba(17, 17, 20, 0.25)',
    scrimSoft: 'rgba(17, 17, 20, 0.15)',

    // Vidrio: negros translúcidos sobre fondo claro
    glass05: '#FFFFFF', // chips y botones blancos sobre la hoja lavanda (08_nuevo_gasto)
    glass07: 'rgba(17, 17, 20, 0.05)',

    // Bordes
    border: '#E7E7EC',
    borderStrong: '#E2E2EA',
    borderPressed: '#C9C9D2',
    borderTop: 'rgba(255, 255, 255, 0.9)', // el brillo superior sigue siendo blanco
    borderTopStrong: '#FFFFFF',
    borderTopAvatar: '#FFFFFF',
    outline: '#666671',
    outlineVariant: '#C9C9D2',
    outlineVariant30: 'rgba(17, 17, 20, 0.08)',
    handle: '#E7E7EC',
    handleSheet: 'rgba(17, 17, 20, 0.15)',

    // Texto
    text: '#111114',
    onSurface: '#1F1F24',
    textVariant: '#52525E',
    textSecondary: '#6B6B76',
    textChip: '#3F3F48',
    textMuted: '#8E8E99',
    textNav: '#6B6B76',
    textSoft: 'rgba(17, 17, 20, 0.9)',
    iconSoft: 'rgba(17, 17, 20, 0.8)',
    amount: '#111114',
    textoSobreColor: '#FFFFFF',

    // Acciones: el botón principal, el + y la pestaña activa se invierten (negro con blanco)
    primary: '#111114',
    primaryFixedDim: '#3A3A42',
    primary40: 'rgba(17, 17, 20, 0.4)',
    onPrimary: '#FFFFFF',
    onPrimaryMuted: '#F0F0F4',
    navbar: 'rgba(255, 255, 255, 0.85)',

    // Sombras: el alfa del color se multiplica por shadowOpacity, así que las mismas opacidades
    // de los estilos dan sombras de 1.5% a 13.5% (Stitch usa 3-4%).
    sombra: 'rgba(17, 17, 20, 0.15)',
    brillo: '#111114', // el halo de botones pasa a una sombra oscura suave

    // Acento
    acento: '#8A55F0',
    acentoTexto: '#5B25CF', // >= 4.5:1 sobre background y sobre el brillo (chip "Todas")
    acentoSuave: 'rgba(138, 85, 240, 0.12)',

    // Nuevo gasto: importe en tarjeta blanca y teclas blancas con borde sutil
    montoFondo: '#FFFFFF',
    montoBorde: '#ECECF1',
    teclaFondo: '#FFFFFF',
    teclaBorde: '#E7E7EC',
    teclaPresionada: '#F0F0F4',

    // Encima del brillo; en Stitch el saludo es carbón. La etiqueta y el lema son más oscuros
    // que el #6B6B76 de Stitch (2.46:1 sobre #8FB0FF) para llegar a 4.5:1.
    saludo: '#111114',
    saludoEtiqueta: '#3F3F48',
    lema: '#3F3F48',

    // Brillo del fondo de 07_inicio_claro_color_fondo_1 (mismo formato que en oscuro). La capa
    // de arriba termina en el color de fondo opaco, como en Stitch, así que tapa la de abajo
    // fuera de su elipse.
    fondoCapas: [
      {
        x: 0.9,
        y: 0.9,
        rx: { ancho: 0.7 },
        ry: { alto: 0.5 },
        stops: [
          { offset: 0, color: '#E3C8FF' },
          { offset: 0.7, color: '#E3C8FF', opacity: 0 },
        ],
      },
      {
        x: 0.5,
        y: 0,
        rx: { ancho: 1.1 },
        ry: { alto: 0.55 },
        stops: [
          { offset: 0, color: '#8FB0FF' },
          { offset: 0.38, color: '#B9A6FF' },
          { offset: 0.72, color: 'rgba(241, 240, 250, 0.92)' },
          { offset: 1, color: '#F1F0FA' },
        ],
      },
    ],

    // Ícono de categoría: reflejo más marcado (efecto vidrio) y sombra más suave, amplia y baja,
    // como la de Stitch claro (rgba(color, 0.28) 0 3px 8px)
    brilloIcono: 'rgba(255, 255, 255, 0.32)',
    brilloIconoFin: 'rgba(255, 255, 255, 0)',
    iconoSombraOpacidad: 0.2,
    iconoSombraRadio: 10,
    iconoSombraY: 6,

    // Semánticos (>= 3:1 sobre blanco; alerta >= 4.5:1 porque también es texto de error)
    exito: '#22A866',
    exitoSuave: 'rgba(34, 168, 102, 0.12)',
    aviso: '#D97706',
    avisoSuave: 'rgba(217, 119, 6, 0.12)',
    alerta: '#C8281C',
    alertaSuave: 'rgba(200, 40, 28, 0.12)',
    alertaSolido: '#C8281C',
  },
};

// Radios del export (Tailwind: DEFAULT 4, lg 8, xl 12, 2xl 16, 3xl 24, full).
export const radios = {
  sm: 4,
  lg: 8,
  xl: 12,
  '2xl': 16,
  tarjeta: 22,
  '3xl': 24,
  panel: 28,
  hoja: 32,
  full: 9999,
};
