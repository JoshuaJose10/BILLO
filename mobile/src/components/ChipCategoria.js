import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colorCategoria, textoSobreCategoria } from '../theme/categorias';
import { colors, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { iconoCategoria } from '../utils/categorias';

// Chip de categoría (Stitch: nuevo_gasto_bottom_sheet + reglas de chips de Luminal Glow).
// px-3 py-1.5 rounded-xl gap-1.5, ícono 15.
// Seleccionado: fondo del color de la categoría, texto e ícono con contraste
// (textoSobreCategoria), font-semibold y halo del mismo color.
// Sin seleccionar: bg-white/[0.05] border-white/10 text-zinc-300 font-medium, ícono zinc-400 y
// micro-punto de 6px del color de la categoría.
// `error` pinta el borde en alerta (no se eligió categoría).
// `icono` reemplaza el que corresponde al nombre y marca un chip que no es categoría (por
// ejemplo "Todas"): sin micro-punto y, seleccionado, con el acento.
export default function ChipCategoria({
  nombre,
  icono,
  seleccionado = false,
  error = false,
  onPress,
}) {
  const esCategoria = !icono;
  const color = colorCategoria(nombre);
  let estiloSeleccionado = null;
  let colorContenido = colors.textSecondary;
  if (seleccionado && esCategoria) {
    estiloSeleccionado = { backgroundColor: color, borderColor: color, shadowColor: color };
    colorContenido = textoSobreCategoria(nombre);
  } else if (seleccionado) {
    estiloSeleccionado = styles.seleccionadoAcento;
    colorContenido = colors.acentoTexto;
  }

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
        estiloSeleccionado,
        error && !seleccionado ? styles.error : null,
        pressed && !seleccionado ? styles.presionado : null,
      ]}
    >
      {esCategoria && !seleccionado ? (
        <View style={[styles.punto, { backgroundColor: color }]} />
      ) : null}
      <MaterialCommunityIcons
        name={icono || iconoCategoria(nombre)}
        size={15}
        color={colorContenido}
      />
      <Text
        style={[
          styles.texto,
          seleccionado ? styles.textoSeleccionado : null,
          seleccionado ? { color: colorContenido } : null,
        ]}
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
  // Halo shadow-[0_0_12px] al 35% del color del chip; el borde conserva el mismo tamaño.
  seleccionado: {
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.35,
  },
  seleccionadoAcento: {
    backgroundColor: colors.acentoSuave,
    borderColor: colors.acento,
    shadowColor: colors.acento,
  },
  error: {
    borderColor: colors.alerta,
  },
  // hover:border-white/20
  presionado: {
    borderColor: colors.borderPressed,
  },
  // Micro-punto w-1.5 h-1.5 rounded-full
  punto: {
    width: 6,
    height: 6,
    borderRadius: radios.full,
  },
  texto: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textChip,
  },
  textoSeleccionado: {
    fontFamily: fonts.sansSemiBold,
  },
});
