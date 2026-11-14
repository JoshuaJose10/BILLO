import { fonts } from './fonts.js';

// Escala tipográfica de Obsidian Luminescence
// (docs/diseno/stitch/stitch-paleta/obsidian_luminescence/DESIGN.md, `typography`).
// Cada entrada es un estilo de React Native listo para mezclar: `{ ...tipografia.bodyMd, color }`.
// Donde Inicio y Movimientos ya usaban un valor que difiere del documento, manda el de la app
// (para que esas pantallas no cambien) y se anota el del documento:
//   - headlineLg: título de pantalla en Inter 700 (el documento dice 600).
//   - headlineMd / headlineSm: tracking -0.025em (saludo de Inicio y títulos de sección).
//   - financialMetricMd: JetBrains Mono 600, como los montos de las filas (el documento dice 500).
// letterSpacing va en px: em × tamaño.
export const tipografia = {
  // 28/34, -0.02em: "Movimientos", "Cartera", "Reportes"
  headlineLg: {
    fontFamily: fonts.sansBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.56,
  },
  // 22/28: saludo de Inicio
  headlineMd: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.55,
  },
  // 18/24: títulos de sección ("Movimientos" del panel de Inicio) y de estados vacíos
  headlineSm: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.45,
  },
  // 16/24, -0.01em
  bodyLg: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
  },
  // 14/20: textos de estado y descripciones
  bodyMd: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  // 12/16, 0.01em: conteo del resumen de Movimientos
  bodySm: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.12,
  },
  // 32/36, -0.02em: total de Movimientos y de Cartera
  financialMetricLg: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.64,
  },
  // 18/22, -0.01em
  financialMetricMd: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.18,
  },
  // 11/14, 0.08em, mayúsculas: Etiqueta
  labelCaps: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    textTransform: 'uppercase',
  },
  // 12/16: texto de pastillas y chips
  labelPill: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
  },
  // 15/20 semibold: pastillas de acción (Stitch, «Send / Request»), p. ej. «↓ Ingreso» de Inicio
  labelAccion: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.15,
  },
};
