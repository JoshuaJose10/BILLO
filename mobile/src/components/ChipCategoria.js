import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { iconoCategoria } from '../utils/categorias';

// Chip de categoría (Stitch: nuevo_gasto_bottom_sheet). px-3 py-1.5 rounded-xl gap-1.5, ícono 15.
// Seleccionado: bg-white text-black font-semibold con brillo blanco.
// Sin seleccionar: bg-white/[0.05] border-white/10 text-zinc-300 font-medium, ícono zinc-400.
// `error` pinta el borde en rojo (no se eligió categoría).
// `icono` reemplaza el que corresponde al nombre (por ejemplo, el chip "Todas").
export default function ChipCategoria({
  nombre,
  icono,
  seleccionado = false,
  error = false,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={nombre}
      accessibilityState={{ selected: seleccionado }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        seleccionado ? styles.seleccionado : null,
        error && !seleccionado ? styles.error : null,
        pressed && !seleccionado ? styles.presionado : null,
      ]}
    >
      <MaterialCommunityIcons
        name={icono || iconoCategoria(nombre)}
        size={15}
        color={seleccionado ? colors.onPrimary : colors.textSecondary}
      />
      <Text
        style={[styles.texto, seleccionado ? styles.textoSeleccionado : null]}
        numberOfLines={1}
      >
        {nombre}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radios.xl,
    backgroundColor: colors.glass05,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  // shadow-[0_0_12px_rgba(255,255,255,0.2)]; el borde blanco conserva el mismo tamaño.
  seleccionado: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.2,
  },
  error: {
    borderColor: colors.error,
  },
  // hover:border-white/20
  presionado: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  texto: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textChip,
  },
  textoSeleccionado: {
    fontFamily: fonts.sansSemiBold,
    color: colors.onPrimary,
  },
});
