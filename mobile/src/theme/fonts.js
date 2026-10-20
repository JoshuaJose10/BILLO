// Tipografía de Obsidian Luminescence. Familias cargadas en App.js con useFonts. En React
// Native cada peso es una familia distinta: se usa fontFamily con el nombre exacto, nunca
// fontWeight.
//   - mono (JetBrains Mono): label-caps, subtítulos de fecha, montos (financial-metric) y la
//     etiqueta de la pestaña activa.
//   - sans (Inter): títulos (headline) y textos normales (body).
export const fonts = {
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoSemiBold: 'JetBrainsMono_600SemiBold',
  monoBold: 'JetBrainsMono_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
};
