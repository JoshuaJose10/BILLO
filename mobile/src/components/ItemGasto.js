import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { fechaRelativa, formatearMonto } from '../utils/formato';
import IconoCategoria from './IconoCategoria';

// Movimiento de la lista (Stitch: Inicio, panel "Movimientos"): ícono de la categoría en color,
// título (nota o categoría), fecha relativa en mono y el monto con "-".
// El backend solo guarda la fecha, sin hora, así que el subtítulo no lleva hora.
// Con `metodoPago` (etiqueta, p. ej. "Efectivo") el subtítulo es "Categoría · Método", para
// listas donde la fecha ya va en el encabezado del día (Movimientos).
// Con `onPress` la fila se puede tocar (para editar el gasto); sin él se ve y se comporta igual
// que una fila fija.
export default function ItemGasto({ gasto, nombreCategoria, metodoPago, onPress }) {
  const styles = useEstilos(crearEstilos);
  const categoria = nombreCategoria || 'Sin categoría';
  const nota = gasto.nota?.trim();
  const titulo = nota || categoria;
  const fecha = fechaRelativa(gasto.fecha);
  const subtitulo = metodoPago
    ? `${categoria} · ${metodoPago}`
    : nota
      ? `${categoria} · ${fecha}`
      : fecha;

  const contenido = (
    <>
      <IconoCategoria nombre={nombreCategoria} />
      <View style={styles.textos}>
        <Text style={styles.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={styles.subtitulo} numberOfLines={1}>
          {subtitulo}
        </Text>
      </View>
      <Text style={styles.monto}>-{formatearMonto(gasto.monto)}</Text>
    </>
  );

  if (!onPress) return <View style={styles.fila}>{contenido}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Editar gasto"
      style={({ pressed }) => [styles.fila, pressed ? styles.presionada : null]}
    >
      {contenido}
    </Pressable>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // flex items-center justify-between p-2.5 rounded-2xl bg-surface-container-low/50; gap-3
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: radios['2xl'],
      backgroundColor: colors.surfaceLow50,
    },
    // Feedback sutil al tocar
    presionada: {
      opacity: 0.7,
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
