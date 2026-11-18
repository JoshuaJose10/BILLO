import { temas } from '../theme/colors';

// Las medidas viven en medidas.js (puro, con tests).
import { PADDING } from './medidas';

// Estilos y tema compartidos por los widgets. Sin imports de react-native-android-widget: así
// sincronizar.js puede usarlo sin romper Expo Go.

// El widget se dibuja fuera del árbol de React (sin TemaProvider): se dibuja una vez por tema y
// Android muestra la variante que corresponde al modo claro/oscuro del sistema. `oscuro` elige el
// color de las categorías (theme/categorias).
export const conTemas = (Widget, props) => ({
  light: <Widget {...props} colors={temas.claro} oscuro={false} />,
  dark: <Widget {...props} colors={temas.oscuro} oscuro />,
});

// Tarjeta raíz del widget: fondo del tema (no negro puro) y bordes de 24dp.
export const contenedor = (colors) => ({
  height: 'match_parent',
  width: 'match_parent',
  borderRadius: 24,
  backgroundColor: colors.background,
});

// Capa con el tinte violeta de marca de arriba hacia abajo (el de HojaInferior), dentro de la
// tarjeta sólida: el degradado reemplaza al fondo, así que sola dejaría ver el fondo de pantalla.
export const brillo = (colors, extra) => ({
  height: 'match_parent',
  width: 'match_parent',
  borderRadius: 24,
  padding: PADDING,
  backgroundGradient: {
    from: colors.tinteHoja,
    to: colors.tinteHojaFin,
    orientation: 'TOP_BOTTOM',
  },
  ...extra,
});

// Jerarquía de texto: título semibold y etiqueta secundaria.
export const titulo = (colors, fontSize = 14) => ({
  fontSize,
  fontWeight: '600',
  color: colors.text,
});
export const etiqueta = (colors, fontSize = 12) => ({
  fontSize,
  letterSpacing: 0.1,
  color: colors.textSecondary,
});

// Pastilla pequeña (chip del mes, categorías, próximo cobro).
export const pastilla = (fondo, extra) => ({
  flexDirection: 'row',
  alignItems: 'center',
  flexGap: 6,
  height: 24,
  paddingHorizontal: 8,
  borderRadius: 12,
  backgroundColor: fondo,
  ...extra,
});
