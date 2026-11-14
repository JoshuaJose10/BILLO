import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { estiloTarjeta } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { formatearMonto } from '../utils/formato';
import ChipServicio from './ChipServicio';

// Inicio (HU-73): suscripciones que cobran en los próximos 7 días y el total de la semana.
// `cobros` y `total` salen de cobrosDeLaSemana. Sin cobros no se muestra. Cada cobro es una
// pastilla (ChipServicio: marca, nombre, monto y día) en una fila con scroll horizontal; tocarla
// abre Cartera › Suscripciones (onPress). `tambien`: «Próximo cobro» ya muestra el primero de la
// semana y esta tarjeta trae el resto, titulada «También esta semana» (HU-72).
export default function TarjetaCobrosSemana({ cobros, total, tambien = false, onPress }) {
  const styles = useEstilos(crearEstilos);
  const { colors } = useTema();
  if (!cobros || cobros.length === 0) return null;

  const titulo = tambien ? 'También esta semana' : 'Esta semana cobran';
  const etiqueta = `${tambien ? 'También esta semana cobran' : titulo} ${cobros.length} ${
    cobros.length === 1 ? 'suscripción' : 'suscripciones'
  }, total ${formatearMonto(total)}`;

  return (
    <View style={styles.tarjeta}>
      <View style={styles.cabecera} accessible accessibilityLabel={etiqueta}>
        <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.text} />
        <Text style={styles.titulo} accessibilityRole="header">
          {titulo}
        </Text>
        <Text style={styles.total}>{formatearMonto(total)}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filaScroll}
        contentContainerStyle={styles.filaChips}
      >
        {cobros.map((c) => (
          <ChipServicio
            key={c.id}
            nombre={c.nombre}
            monto={c.costo}
            detalle={c.dia}
            onPress={onPress}
            accessibilityHint="Abre tus suscripciones en Cartera"
          />
        ))}
      </ScrollView>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // Misma tarjeta que «Próximo cobro» y «Gastado este mes», con la misma separación
    tarjeta: {
      marginTop: 14,
      gap: 10,
      ...estiloTarjeta(colors),
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
    // Pastillas hasta el borde de la tarjeta (p-3.5), como las filas de chips de las hojas
    filaScroll: {
      marginHorizontal: -14,
      flexGrow: 0,
    },
    filaChips: {
      gap: 8,
      paddingHorizontal: 14,
    },
  });
