// Tokens del sistema "Obsidian Luminescence" (docs/diseno/stitch/obsidian_luminescence y la
// configuración de Tailwind de las pantallas oscuras del export de Stitch).
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

    // Vidrio: blancos translúcidos sobre fondo oscuro
    glass04: 'rgba(255, 255, 255, 0.04)',
    glass05: 'rgba(255, 255, 255, 0.05)',
    glass07: 'rgba(255, 255, 255, 0.07)',
    glass08: 'rgba(255, 255, 255, 0.08)',

    // Bordes
    border: 'rgba(255, 255, 255, 0.08)', // Border Subtle
    borderSoft: 'rgba(255, 255, 255, 0.05)', // white/5
    borderStrong: 'rgba(255, 255, 255, 0.10)', // white/10
    borderTop: 'rgba(255, 255, 255, 0.08)', // brillo superior de tarjetas, panel y hoja
    outlineVariant: '#444748',
    handle: '#444748',

    // Texto
    text: '#FFFFFF', // primary
    onSurface: '#E2E2E2',
    textVariant: '#C4C7C8', // on-surface-variant
    textSecondary: '#A1A1AA', // zinc-400 / Tertiary Text
    textChip: '#D4D4D8', // zinc-300
    textMuted: '#71717A', // zinc-500 / Muted Text
    textNav: '#A3A3A3', // neutral-400 (pestañas inactivas)
    amount: '#E2E1EB', // secondary-fixed (montos de egresos)
    error: '#FFB4AB',

    // Acciones
    primary: '#FFFFFF',
    onPrimary: '#000000',
    navbar: 'rgba(24, 24, 27, 0.75)', // #18181b/75

    // Indicador de fuerza de contraseña (HU-13)
    fuerzaDebil: '#F87171',
    fuerzaMedia: '#FBBF24',
    fuerzaFuerte: '#4ADE80',
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
