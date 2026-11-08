import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { tipografia } from '../theme/tipografia';
import { iconoCategoria } from '../utils/categorias';
import { formatearMonto, formatearMontoCorto } from '../utils/formato';
import { descripcionDona, formatearPorcentaje } from '../utils/reportes';
import Etiqueta from './Etiqueta';

const RADIO = 96;
const RADIO_INTERIOR = 66;

// Dona del gasto por categoría (RF8) con el gasto del mes al centro y la leyenda debajo.
// - `datos`: de armarDatosDona; debe traer al menos una categoría. Cada rebanada ya trae
//   colorCategoria(nombre, esOscuro), el mismo color que la categoría en Inicio.
// - `total`: gasto_variable del mes. La dona solo reparte los gastos, no las membresías.
// La leyenda usa los chips de la tarjeta de Inicio (HU-81): punto del color, ícono y monto, más el
// porcentaje en tono secundario.
// PieChart pinta el centro encima de las rebanadas, así que `innerCircleColor` debe ser opaco e
// igual al fondo de la tarjeta (`tarjetaResumenOpaca`).
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
          innerCircleColor={colors.tarjetaResumenOpaca}
          strokeColor={colors.tarjetaResumenOpaca}
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

      <View style={styles.chips}>
        {datos.map((d) => (
          <View
            key={d.id}
            style={styles.chip}
            accessible
            accessibilityLabel={`${d.etiqueta}: ${formatearMonto(d.value)}, ${formatearPorcentaje(d.porcentaje)}`}
          >
            <View style={[styles.punto, { backgroundColor: d.color }]} />
            <MaterialCommunityIcons
              name={iconoCategoria(d.etiqueta)}
              size={14}
              color={colors.text}
            />
            <Text style={styles.chipMonto}>{formatearMontoCorto(d.value)}</Text>
            <Text style={styles.chipPorcentaje}>{formatearPorcentaje(d.porcentaje)}</Text>
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
      gap: espacios.lg,
    },
    centro: {
      alignItems: 'center',
      gap: espacios.xs,
      width: RADIO_INTERIOR * 2 - 20,
    },
    centroEtiqueta: {
      color: colors.outline,
    },
    centroTotal: {
      ...tipografia.financialMetricMd,
      color: colors.text,
    },
    // Chips de Inicio (TarjetaResumen): flex-wrap gap-2
    chips: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacios.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: espacios.xs,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceChip,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    punto: {
      width: 6,
      height: 6,
      borderRadius: radios.full,
    },
    // Igual que chipMonto de Inicio: JetBrains Mono 500, 12 px
    chipMonto: {
      fontFamily: fonts.monoMedium,
      fontSize: 12,
      lineHeight: 16,
      color: colors.text,
    },
    chipPorcentaje: {
      ...tipografia.labelCaps,
      textTransform: 'none',
      letterSpacing: 0,
      color: colors.textSecondary,
    },
  });
