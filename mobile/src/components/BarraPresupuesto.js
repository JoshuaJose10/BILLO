import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';

// ~500 ms al cargar o al cambiar de mes. Con "Reducir movimiento" (ReduceMotion.System, el
// valor por defecto de withTiming) la barra salta directo a su valor, sin animar.
const LLENADO = { duration: 500, easing: Easing.out(Easing.cubic) };

// Color de la barra según el `estado` que calcula la API (no se recalcula aquí).
export const colorEstado = (colors, estado) =>
  estado === 'excedido' ? colors.alerta : estado === 'alerta' ? colors.aviso : colors.exito;

// Barra de avance de un presupuesto. `fraccion` (0 a 1, ya con tope en 1) y `porcentaje` (el real,
// para el lector de pantalla). `etiqueta`: p. ej. "Comida: 84% del presupuesto, alerta".
export default function BarraPresupuesto({ fraccion, porcentaje, estado, etiqueta, style }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const avance = useSharedValue(0);

  useEffect(() => {
    avance.set(withTiming(fraccion, LLENADO));
  }, [avance, fraccion]);

  const estiloRelleno = useAnimatedStyle(() => ({ width: `${avance.value * 100}%` }));

  return (
    <View
      style={[styles.pista, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 0, max: 100, now: Math.min(Math.round(porcentaje), 100) }}
    >
      <Animated.View
        style={[styles.relleno, { backgroundColor: colorEstado(colors, estado) }, estiloRelleno]}
      />
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // h-1.5 rounded-full
    pista: {
      height: 6,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHighest,
      overflow: 'hidden',
    },
    relleno: {
      height: '100%',
      borderRadius: radios.full,
    },
  });
