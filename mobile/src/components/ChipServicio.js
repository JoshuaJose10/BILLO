import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { tipografia } from '../theme/tipografia';
import { formatearMontoCorto } from '../utils/formato';
import { estiloServicio, inicialServicio } from '../utils/membresias';

// Chip de un servicio: mini squircle con el color de marca (theme/servicios.js; ícono o inicial),
// nombre y monto en mono. Seleccionado toma el acento, como el chip "Todas" de categorías.
// - Catálogo de la hoja Membresía: `monto` = costo sugerido, con `seleccionado`.
// - «Esta semana cobran» de Inicio: `detalle` = día del cobro ("Hoy", "Mañana", "lun").
export default function ChipServicio({
  nombre,
  monto,
  detalle,
  seleccionado = false,
  onPress,
  accessibilityHint,
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const { color, icono, predefinido } = estiloServicio(nombre);
  const montoCorto = formatearMontoCorto(monto);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      accessibilityLabel={[nombre, montoCorto, detalle].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.chip,
        seleccionado ? styles.seleccionado : null,
        pressed && !seleccionado ? styles.presionado : null,
      ]}
    >
      <View style={[styles.miniSquircle, { backgroundColor: color }]}>
        {predefinido ? (
          <MaterialCommunityIcons name={icono} size={12} color={colors.textoSobreColor} />
        ) : (
          <Text style={styles.miniInicial}>{inicialServicio(nombre)}</Text>
        )}
      </View>
      <Text style={[styles.texto, seleccionado ? styles.textoActivo : null]} numberOfLines={1}>
        {nombre}
      </Text>
      <Text style={styles.monto}>{montoCorto}</Text>
      {detalle ? <Text style={styles.detalle}>· {detalle}</Text> : null}
    </Pressable>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
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
    seleccionado: {
      backgroundColor: colors.acentoSuave,
      borderColor: colors.acento,
    },
    presionado: {
      borderColor: colors.borderPressed,
    },
    miniSquircle: {
      width: 20,
      height: 20,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniInicial: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textoSobreColor,
    },
    texto: {
      ...tipografia.labelPill,
      color: colors.textChip,
      maxWidth: 120,
    },
    textoActivo: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
    },
    monto: {
      ...tipografia.labelCaps,
      textTransform: 'none',
      letterSpacing: 0,
      color: colors.textSecondary,
    },
    detalle: {
      ...tipografia.labelPill,
      color: colors.textSecondary,
    },
  });
