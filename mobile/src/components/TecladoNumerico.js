import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { TECLA_BORRAR, TECLA_PUNTO } from '../utils/monto';

const FILAS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [TECLA_PUNTO, '0', TECLA_BORRAR],
];

// Teclado 4x3 (Stitch: nuevo_gasto_bottom_sheet y 08_nuevo_gasto_referencia): grid gap-1.5,
// teclas h-11 rounded-xl con borde sutil (vidrio en oscuro, blancas sobre la hoja lavanda en
// claro), texto 18 medium; al presionar se aclaran u oscurecen y scale-95. Las reglas del monto viven en utils/monto.js.
export default function TecladoNumerico({ onTecla, disabled = false }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.teclado}>
      {FILAS.map((fila) => (
        <View key={fila.join('')} style={styles.fila}>
          {fila.map((tecla) => (
            <Pressable
              key={tecla}
              onPress={() => onTecla(tecla)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={tecla === TECLA_BORRAR ? 'Borrar dígito' : tecla}
              style={({ pressed }) => [styles.tecla, pressed ? styles.presionada : null]}
            >
              {tecla === TECLA_BORRAR ? (
                <MaterialCommunityIcons
                  name="backspace-outline"
                  size={19}
                  color={colors.iconSoft}
                />
              ) : (
                <Text style={[styles.texto, tecla === TECLA_PUNTO ? styles.punto : null]}>
                  {tecla}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    teclado: {
      gap: 6,
    },
    fila: {
      flexDirection: 'row',
      gap: 6,
    },
    tecla: {
      flex: 1,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radios.xl,
      backgroundColor: colors.teclaFondo,
      borderWidth: 1,
      borderColor: colors.teclaBorde,
    },
    presionada: {
      backgroundColor: colors.teclaPresionada,
      transform: [{ scale: 0.95 }],
    },
    // text-lg font-medium text-white
    texto: {
      fontFamily: fonts.sansMedium,
      fontSize: 18,
      lineHeight: 28,
      color: colors.text,
    },
    // "." font-semibold text-white/90
    punto: {
      fontFamily: fonts.sansSemiBold,
      color: colors.textSoft,
    },
  });
