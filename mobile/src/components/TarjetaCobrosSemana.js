import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { formatearMonto } from '../utils/formato';

// Máximo de filas visibles; el resto se resume en "+N más" (el total siempre incluye todas).
const MAX_FILAS = 3;

// Inicio (HU-73): suscripciones que cobran en los próximos 7 días y el total de la semana.
// `cobros` y `total` salen de cobrosDeLaSemana. Sin cobros no se muestra. Al tocarla abre
// Cartera › Suscripciones (onPress). `tambien`: «Próximo cobro» ya muestra el primero de la
// semana y esta tarjeta trae el resto, titulada «También esta semana» (HU-72).
export default function TarjetaCobrosSemana({ cobros, total, tambien = false, onPress }) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  if (!cobros || cobros.length === 0) return null;

  const visibles = cobros.slice(0, MAX_FILAS);
  const ocultas = cobros.length - visibles.length;
  const titulo = tambien ? 'También esta semana' : 'Esta semana cobran';
  const etiqueta = `${tambien ? 'También esta semana cobran' : titulo} ${cobros.length} ${
    cobros.length === 1 ? 'suscripción' : 'suscripciones'
  }, total ${formatearMonto(total)}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint="Abre tus suscripciones en Cartera"
      style={({ pressed }) => [styles.tarjeta, pressed ? styles.presionada : null]}
    >
      <View style={styles.cabecera}>
        <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.text} />
        <Text style={styles.titulo} accessibilityRole="header">
          {titulo}
        </Text>
        <Text style={styles.total}>{formatearMonto(total)}</Text>
      </View>
      {visibles.map((c) => (
        <View key={c.id} style={styles.fila}>
          <Text style={styles.nombre} numberOfLines={1}>
            {c.nombre}
          </Text>
          <Text style={styles.detalle} numberOfLines={1}>
            {formatearMonto(c.costo)} · {c.dia}
          </Text>
        </View>
      ))}
      {ocultas > 0 ? <Text style={styles.mas}>+{ocultas} más</Text> : null}
    </Pressable>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    tarjeta: {
      marginTop: 18,
      padding: 14,
      gap: 8,
      borderRadius: radios['2xl'],
      backgroundColor: colors.filaOpaca,
    },
    presionada: {
      opacity: 0.7,
    },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    titulo: {
      flex: 1,
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: -0.4,
      color: colors.text,
    },
    total: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    nombre: {
      flex: 1,
      fontFamily: fonts.sansMedium,
      fontSize: 14,
      color: colors.text,
    },
    detalle: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
    },
    mas: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
  });
