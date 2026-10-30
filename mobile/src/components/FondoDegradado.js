import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '../theme/colors';

// Brillo atmosférico de Luminal Glow (07_inicio_oscuro_gradiente_fondo): halo índigo desde la
// esquina superior izquierda y violeta desde la derecha, que se desvanecen sobre el fondo de la
// pantalla. Va como primer hijo de una vista con fondo `colors.background`; no recibe toques.
// Son degradados radiales en pantalla completa: el último stop llega a opacidad 0 dentro del
// círculo, así que no queda ningún borde visible. Las medidas en píxeles (userSpaceOnUse)
// mantienen el círculo redondo en cualquier proporción de pantalla.
export default function FondoDegradado() {
  const { width, height } = useWindowDimensions();

  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      <Defs>
        <RadialGradient
          id="brilloIndigo"
          cx={width * 0.15}
          cy={0}
          r={width * 0.95}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={colors.brilloIndigo} />
          <Stop offset="1" stopColor={colors.brilloIndigo} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient
          id="brilloVioleta"
          cx={width * 0.9}
          cy={height * 0.05}
          r={width * 0.9}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={colors.brilloVioleta} />
          <Stop offset="1" stopColor={colors.brilloVioleta} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#brilloIndigo)" />
      <Rect x="0" y="0" width={width} height={height} fill="url(#brilloVioleta)" />
    </Svg>
  );
}
