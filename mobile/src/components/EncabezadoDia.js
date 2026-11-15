import { StyleSheet, Text, View } from 'react-native';

import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { formatearMonto } from '../utils/formato';

// Encabezado de un grupo de movimientos (Stitch: movimientos_modo_oscuro, "Grupo: Hoy"):
// el día a la izquierda ("Hoy", "Ayer", "Jueves 7 oct") y el total del día a la derecha. Sin
// gastos ese día (total 0: solo ingresos o cobros de suscripciones) no se muestra el monto.
export default function EncabezadoDia({ titulo, total, style }) {
  const styles = useEstilos(crearEstilos);
  return (
    <View style={[styles.fila, style]} accessibilityRole="header">
      <Text style={styles.titulo} numberOfLines={1}>
        {titulo}
      </Text>
      {total ? <Text style={styles.total}>{formatearMonto(total)}</Text> : null}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // flex items-center justify-between px-1
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 4,
    },
    // font-headline-sm text-headline-sm text-primary tracking-tight
    titulo: {
      fontFamily: fonts.sansSemiBold,
      flexShrink: 1,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.18,
      color: colors.text,
    },
    // font-label-caps text-label-caps text-outline
    total: {
      fontFamily: fonts.monoMedium,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.4,
      color: colors.outline,
    },
  });
