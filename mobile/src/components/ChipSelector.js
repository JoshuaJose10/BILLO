import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';

// Píldora compacta que abre un selector: método de pago, fecha o nota.
// Stitch (nuevo_gasto_bottom_sheet): px-3 py-1 rounded-full bg-white/[0.05] border-white/10,
// texto 11px zinc-300 medium, íconos 13px zinc-400, gap-1.5. Al presionar toma el acento.
export default function ChipSelector({
  etiqueta,
  icono,
  chevron = false,
  onPress,
  accessibilityLabel,
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || etiqueta}
      hitSlop={8}
      style={({ pressed }) => [styles.chip, pressed ? styles.presionado : null]}
    >
      {icono ? (
        <MaterialCommunityIcons name={icono} size={13} color={colors.textSecondary} />
      ) : null}
      <Text style={styles.texto} numberOfLines={1}>
        {etiqueta}
      </Text>
      {chevron ? (
        <MaterialCommunityIcons name="chevron-down" size={13} color={colors.textSecondary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radios.full,
    backgroundColor: colors.glass05,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  // Activo (al presionar): borde y fondo translúcido del acento.
  presionado: {
    backgroundColor: colors.acentoSuave,
    borderColor: colors.acento,
  },
  texto: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textChip,
    maxWidth: 140,
  },
});
