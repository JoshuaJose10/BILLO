import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { formatearMonto } from '../utils/formato';
import { descripcionDona, formatearPorcentaje } from '../utils/reportes';
import Etiqueta from './Etiqueta';

const RADIO = 96;
const RADIO_INTERIOR = 66;

// Dona del gasto por categoría (RF8) con el gasto del mes al centro y la leyenda debajo.
// - `datos`: de armarDatosDona; debe traer al menos una categoría.
// - `total`: gasto_variable del mes. La dona solo reparte los gastos, no las membresías.
// PieChart pinta el centro encima de las rebanadas, así que `innerCircleColor` debe ser opaco e
// igual al fondo de la tarjeta (`surfaceLow`).
export default function DonaCategorias({ datos, total }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  return (
    <View style={styles.contenedor}>
      <View accessible accessibilityRole="image" accessibilityLabel={descripcionDona(datos)}>
        <PieChart
          donut
          data={datos}
          radius={RADIO}
          innerRadius={RADIO_INTERIOR}
          innerCircleColor={colors.surfaceLow}
          strokeColor={colors.surfaceLow}
          strokeWidth={2}
          centerLabelComponent={() => (
            <View style={styles.centro}>
              <Etiqueta style={styles.centroEtiqueta}>Gastado</Etiqueta>
              <Text style={styles.centroTotal} numberOfLines={1} adjustsFontSizeToFit>
                {formatearMonto(total)}
              </Text>
            </View>
          )}
        />
      </View>

      <View style={styles.leyenda}>
        {datos.map((d) => (
          <View key={d.id} style={styles.fila}>
            <View style={[styles.punto, { backgroundColor: d.color }]} />
            <Text style={styles.nombre} numberOfLines={1}>
              {d.etiqueta}
            </Text>
            <Text style={styles.monto} numberOfLines={1}>
              {formatearMonto(d.value)}
            </Text>
            <Text style={styles.porcentaje} numberOfLines={1}>
              {formatearPorcentaje(d.porcentaje)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    contenedor: {
      alignItems: 'center',
      gap: 20,
    },
    centro: {
      alignItems: 'center',
      gap: 4,
      width: RADIO_INTERIOR * 2 - 20,
    },
    centroEtiqueta: {
      color: colors.outline,
    },
    centroTotal: {
      fontFamily: fonts.monoSemiBold,
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: -0.32,
      color: colors.text,
    },
    leyenda: {
      alignSelf: 'stretch',
      gap: 12,
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    punto: {
      width: 10,
      height: 10,
      borderRadius: radios.full,
    },
    nombre: {
      flex: 1,
      fontFamily: fonts.sansMedium,
      fontSize: 14,
      lineHeight: 20,
      color: colors.onSurface,
    },
    monto: {
      fontFamily: fonts.monoMedium,
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
    },
    porcentaje: {
      fontFamily: fonts.monoMedium,
      fontSize: 12,
      lineHeight: 18,
      minWidth: 56,
      textAlign: 'right',
      color: colors.textSecondary,
    },
  });
