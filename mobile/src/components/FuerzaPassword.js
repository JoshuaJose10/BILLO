import { StyleSheet, Text, View } from 'react-native';

import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { fuerzaPassword, MIN_PASSWORD } from '../utils/validacion';

// Pista "Mínimo 8 caracteres" con 3 barritas de fuerza; va en el `pie` del Input de una
// contraseña nueva (Registro y Restablecer).
export default function FuerzaPassword({ password }) {
  const fuerza = fuerzaPassword(password);
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  // Color de cada barrita encendida (Stitch: bg-outline, bg-on-surface-variant, bg-primary).
  const colorBarra = [colors.outline, colors.textVariant, colors.primary];
  return (
    <View style={styles.pistaFila}>
      <Text style={styles.pista}>Mínimo {MIN_PASSWORD} caracteres</Text>
      <View style={styles.barras} accessibilityLabel={`Fuerza de la contraseña: ${fuerza} de 3`}>
        {[1, 2, 3].map((n) => (
          <View
            key={n}
            style={[
              styles.barra,
              { backgroundColor: n <= fuerza ? colorBarra[n - 1] : colors.surfaceBright },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // mt-1 px-1
    pistaFila: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
      paddingHorizontal: 4,
    },
    // body-sm: Inter 400 12/16, tracking 0.01em, text-outline
    pista: {
      fontFamily: fonts.sans,
      color: colors.outline,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.12,
    },
    // gap-1
    barras: {
      flexDirection: 'row',
      gap: 4,
    },
    // w-5 h-1 rounded-full
    barra: {
      width: 20,
      height: 4,
      borderRadius: 2,
    },
  });
