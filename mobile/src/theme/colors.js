import { Platform } from 'react-native';

// Paletas por tema. Para el tema claro basta con agregar `claro` con las mismas claves
// y elegir cuál exportar (o leerlo con useColorScheme cuando se implemente).
export const temas = {
  oscuro: {
    background: '#000000',
    surface: '#0E0E10',
    card: '#1A1A1D',
    border: '#2A2A2E',
    text: '#FFFFFF',
    textSecondary: '#A1A1AA',
    error: '#F87171',
    handle: '#3F3F46',
    primary: '#FFFFFF',
    onPrimary: '#000000',
    fuerzaDebil: '#F87171',
    fuerzaMedia: '#FBBF24',
    fuerzaFuerte: '#4ADE80',
  },
};

export const colors = temas.oscuro;

export const fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};
