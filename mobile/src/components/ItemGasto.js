import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { iconoCategoria } from '../utils/categorias';
import { fechaRelativa, formatearMonto } from '../utils/formato';

// Movimiento de la lista (Stitch: Inicio, panel "Movimientos"): ícono de la categoría,
// título (nota o categoría), fecha relativa en mono y el monto con "-".
// El backend solo guarda la fecha, sin hora, así que el subtítulo no lleva hora.
export default function ItemGasto({ gasto, nombreCategoria }) {
  const categoria = nombreCategoria || 'Sin categoría';
  const titulo = gasto.nota?.trim() || categoria;
  const subtitulo = gasto.nota?.trim()
    ? `${categoria} · ${fechaRelativa(gasto.fecha)}`
    : fechaRelativa(gasto.fecha);

  return (
    <View style={styles.fila}>
      <View style={styles.icono}>
        <MaterialCommunityIcons
          name={iconoCategoria(nombreCategoria)}
          size={20}
          color={colors.text}
        />
      </View>
      <View style={styles.textos}>
        <Text style={styles.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={styles.subtitulo} numberOfLines={1}>
          {subtitulo}
        </Text>
      </View>
      <Text style={styles.monto}>-{formatearMonto(gasto.monto)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // flex items-center justify-between p-2.5 rounded-2xl bg-surface-container-low/50; gap-3
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radios['2xl'],
    backgroundColor: 'rgba(27, 27, 27, 0.5)',
  },
  // w-10 h-10 rounded-2xl bg-surface-container-high
  icono: {
    width: 40,
    height: 40,
    borderRadius: radios['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  textos: {
    flex: 1,
  },
  // font-body-md text-body-md text-primary font-medium tracking-tight
  titulo: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.35,
    color: colors.text,
  },
  // font-label-caps text-[10px] text-on-surface-variant
  subtitulo: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    color: colors.textVariant,
  },
  // font-financial-metric-md text-body-lg text-secondary-fixed font-semibold
  monto: {
    fontFamily: fonts.monoSemiBold,
    fontSize: 16,
    letterSpacing: -0.16,
    color: colors.amount,
  },
});
