import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '../theme/colors';

// Brillo atmosférico de Luminal Glow (07_inicio_oscuro_gradiente_fondo): halo índigo desde la
// esquina superior izquierda y violeta desde la derecha, que se desvanecen sobre el fondo de la
// pantalla. Va como primer hijo de una vista con fondo `colors.background`; no recibe toques.
export default function FondoDegradado() {
  const { height } = useWindowDimensions();

  return (
    <View style={[styles.capa, { height: height * 0.6 }]} pointerEvents="none">
      <LinearGradient
        colors={[colors.brilloIndigo, colors.brilloIndigoFin]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[colors.brilloVioleta, colors.brilloVioletaFin]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  capa: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
