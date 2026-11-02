import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colorCategoria } from '../theme/categorias';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';

// ~500 ms al cargar o al cambiar de mes. Con "Reducir movimiento" (ReduceMotion.System, el
// valor por defecto de withTiming) la barra salta directo a su valor, sin animar.
const LLENADO = { duration: 500, easing: Easing.out(Easing.cubic) };
// Fundido corto del color al cambiar de estado (por ejemplo, al volver de registrar un gasto).
const CAMBIO_COLOR = { duration: 220, easing: Easing.out(Easing.quad) };

// Color de la barra según el `estado` que calcula la API (no se recalcula aquí): dentro del
// límite, el color de la categoría; cerca del límite, aviso; excedido, alerta.
export const colorEstado = (colors, estado, categoria, esOscuro) =>
  estado === 'excedido'
    ? colors.alerta
    : estado === 'alerta'
      ? colors.aviso
      : colorCategoria(categoria, esOscuro);

// Barra de avance de un presupuesto. `fraccion` (0 a 1, ya con tope en 1) y `porcentaje` (el real,
// para el lector de pantalla). `etiqueta`: p. ej. "Comida: 84% del presupuesto, alerta".
export default function BarraPresupuesto({
  fraccion,
  porcentaje,
  estado,
  categoria,
  etiqueta,
  style,
}) {
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const color = colorEstado(colors, estado, categoria, esOscuro);
  const avance = useSharedValue(0);
  const relleno = useSharedValue(color);

  useEffect(() => {
    avance.set(withTiming(fraccion, LLENADO));
  }, [avance, fraccion]);

  useEffect(() => {
    relleno.set(withTiming(color, CAMBIO_COLOR));
  }, [relleno, color]);

  const estiloRelleno = useAnimatedStyle(() => ({
    width: `${avance.value * 100}%`,
    backgroundColor: relleno.value,
  }));

  return (
    <View
      style={[styles.pista, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 0, max: 100, now: Math.min(Math.round(porcentaje), 100) }}
    >
      <Animated.View style={[styles.relleno, estiloRelleno]} />
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
