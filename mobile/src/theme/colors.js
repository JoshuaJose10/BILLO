// Tokens del sistema "Obsidian Luminescence" (docs/diseno/stitch/obsidian_luminescence y la
// configuración de Tailwind de las pantallas oscuras del export de Stitch), más el acento y los
// semánticos de "Luminal Glow" (docs/diseno/paleta.md). Los colores de categoría viven en
// theme/categorias.js.
// Para el tema claro basta con agregar `claro` con las mismas claves y elegir cuál exportar.
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
    surfaceInput: 'rgba(31, 31, 31, 0.9)', // surface-container/90 (campos de Login y Registro)
    surfaceChip: '#1C1C1E', // chips de la tarjeta de resumen

    // Superficies translúcidas (sufijo = opacidad, como el /NN de Tailwind)
    background60: 'rgba(19, 19, 19, 0.6)', // velo del fondo de Login y Registro
    surfaceLow50: 'rgba(27, 27, 27, 0.5)', // fila de gasto
    surfaceLow70: 'rgba(27, 27, 27, 0.7)', // tarjeta de resumen
    surfaceLowest80: 'rgba(14, 14, 14, 0.8)', // panel de Inicio
    surfaceHigh80: 'rgba(42, 42, 42, 0.8)', // botones de ícono e ícono de Login y Registro
    surfaceBright40: 'rgba(57, 57, 57, 0.4)', // monolito del fondo de Login y Registro

    // Velos detrás de hojas y paneles
    scrim: 'rgba(0, 0, 0, 0.6)',
    scrimSoft: 'rgba(0, 0, 0, 0.4)',

    // Vidrio: blancos translúcidos sobre fondo oscuro
    glass04: 'rgba(255, 255, 255, 0.04)',
    glass05: 'rgba(255, 255, 255, 0.05)',
    glass07: 'rgba(255, 255, 255, 0.07)',
    glass08: 'rgba(255, 255, 255, 0.08)',

    // Bordes
    border: 'rgba(255, 255, 255, 0.08)', // Border Subtle
    borderSoft: 'rgba(255, 255, 255, 0.05)', // white/5
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
    error: '#FFB4AB',

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

    // Semánticos de estado financiero; la variante Suave (~15%) es para fondos de barras y avisos
    exito: '#10B981', // en meta / ingresos
    exitoSuave: 'rgba(16, 185, 129, 0.15)',
    aviso: '#FF9F0A', // cerca del límite
    avisoSuave: 'rgba(255, 159, 10, 0.15)',
    alerta: '#FF453A', // límite excedido
    alertaSuave: 'rgba(255, 69, 58, 0.15)',
  },
};

export const colors = temas.oscuro;

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
