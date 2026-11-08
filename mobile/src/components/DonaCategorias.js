import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { formatearMonto, MONEDA } from '../utils/formato';
import { descripcionDona } from '../utils/reportes';
import Etiqueta from './Etiqueta';

const RADIO = 104;
const RADIO_INTERIOR = 78;

// Dona del gasto por categoría (RF8; diseño HU-81, Stitch reportes_modo_oscuro/_claro).
// - `datos`: de armarDatosDona; debe traer al menos una categoría. Cada rebanada ya trae
//   colorCategoria(nombre, esOscuro): el mismo color que el ícono de la categoría en el desglose,
//   que hace de leyenda.
// - `total`: gasto_variable del mes (igual a la suma de la dona; las membresías no entran).
// - `nombreMes`: "Noviembre", para la pastilla "MXN · Noviembre".
// Al centro, "Total gastado" con el monto en mono y los centavos más chicos.
// PieChart pinta el centro encima de las rebanadas, así que `innerCircleColor` debe ser opaco e
// igual al fondo de la tarjeta (`tarjetaResumenOpaca`).
export default function DonaCategorias({ datos, total, nombreMes }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  // "$1,237.25" → "$1,237" y ".25"
  const texto = formatearMonto(total);
  const punto = texto.lastIndexOf('.');
  const entero = punto >= 0 ? texto.slice(0, punto) : texto;
  const centavos = punto >= 0 ? texto.slice(punto) : '';

  return (
    <View
      style={styles.contenedor}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Total gastado ${texto}. ${descripcionDona(datos)}`}
    >
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
            <Etiqueta style={styles.centroEtiqueta}>Total gastado</Etiqueta>
            <Text style={styles.centroMonto} numberOfLines={1} adjustsFontSizeToFit>
              <Text style={styles.centroEntero}>{entero}</Text>
              <Text style={styles.centroCentavos}>{centavos}</Text>
            </Text>
            <View style={styles.pastilla}>
              <View style={styles.pastillaPunto} />
              <Text style={styles.pastillaTexto} numberOfLines={1}>
                {MONEDA} · {nombreMes}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    contenedor: {
      alignItems: 'center',
      paddingVertical: espacios.xs,
    },
    centro: {
      alignItems: 'center',
      gap: espacios.xs,
      width: RADIO_INTERIOR * 2 - 16,
    },
    centroEtiqueta: {
      fontSize: 10,
      color: colors.textVariant,
    },
    centroMonto: {
      textAlign: 'center',
    },
    centroEntero: {
      ...tipografia.financialMetricLg,
      color: colors.text,
    },
    centroCentavos: {
      ...tipografia.financialMetricMd,
      color: colors.textSecondary,
    },
    // rounded-full con punto (oscuro: surface-container-high; claro: neutral-100 con borde)
    pastilla: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: espacios.sm,
      paddingVertical: 2,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    pastillaPunto: {
      width: 6,
      height: 6,
      borderRadius: radios.full,
      backgroundColor: colors.text,
    },
    pastillaTexto: {
      ...tipografia.labelCaps,
      fontSize: 9,
      lineHeight: 12,
      color: colors.textSecondary,
    },
  });
