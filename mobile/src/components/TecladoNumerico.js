import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { TECLA_BORRAR, TECLA_PUNTO } from '../utils/monto';

const FILAS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [TECLA_PUNTO, '0', TECLA_BORRAR],
];

// Teclado 4x3 de vidrio (Stitch: nuevo_gasto_bottom_sheet): grid gap-1.5, teclas h-11
// rounded-xl bg-white/[0.04] border-white/5, texto 18 medium; al presionar bg-white/[0.08] y
// scale-95. Las reglas del monto viven en utils/monto.js.
export default function TecladoNumerico({ onTecla, disabled = false }) {
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

const styles = StyleSheet.create({
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
    backgroundColor: colors.glass04,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  presionada: {
    backgroundColor: colors.glass08,
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
