import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTema } from '../theme/TemaContext';

// Radio de una capa: px, o fracción del ancho ({ ancho }) o del alto ({ alto }) de la pantalla,
// como los porcentajes de radial-gradient en CSS.
const medida = (valor, width, height) => {
  if (typeof valor === 'number') return valor;
  return valor.ancho != null ? valor.ancho * width : valor.alto * height;
};

// Brillo atmosférico de Luminal Glow: los radial-gradient del fondo de Inicio en Stitch
// (07_inicio_oscuro_gradiente_fondo_1 y 07_inicio_claro_color_fondo_1), traducidos a elipses de
// react-native-svg. Las capas salen de `colors.fondoCapas` y cambian con el tema. Va como primer
// hijo de una vista con fondo `colors.background`; no recibe toques.
export default function FondoDegradado() {
  const { width, height } = useWindowDimensions();
  const { colors } = useTema();

  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      <Defs>
        {colors.fondoCapas.map((capa, i) => (
          <RadialGradient
            key={i}
            id={`fondoCapa${i}`}
            cx={capa.x * width}
            cy={capa.y * height}
            rx={medida(capa.rx, width, height)}
            ry={medida(capa.ry, width, height)}
            gradientUnits="userSpaceOnUse"
          >
            {capa.stops.map((stop) => (
              <Stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity ?? 1}
              />
            ))}
          </RadialGradient>
        ))}
      </Defs>
      {colors.fondoCapas.map((_capa, i) => (
        <Rect key={i} x="0" y="0" width={width} height={height} fill={`url(#fondoCapa${i})`} />
      ))}
    </Svg>
  );
}
