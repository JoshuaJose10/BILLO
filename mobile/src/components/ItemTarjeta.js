import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { espacios, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { formatearMonto } from '../utils/formato';
import { colorTarjeta, subtituloTarjeta, textoFechasTarjeta } from '../utils/tarjetas';

// Tarjeta individual en Cartera → Tarjetas (HU-89): squircle con el color de marca/tipo,
// nombre, tipo + ·· últimos 4, total gastado del mes en tipografía mono y píldora opcional
// con día de corte y día de pago.
export default function ItemTarjeta({ tarjeta, opaca = false }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  const colorMarca = colorTarjeta(tarjeta);
  const icono = tarjeta?.tipo === 'credito' ? 'credit-card-chip-outline' : 'credit-card-outline';
  const fechas = textoFechasTarjeta(tarjeta);
  const totalMes = Number(tarjeta?.total_mes) || 0;

  return (
    <View style={[styles.tarjeta, opaca ? styles.tarjetaOpaca : null]}>
      <View style={styles.filaSuperior}>
        <View style={[styles.squircle, { backgroundColor: colorMarca, shadowColor: colorMarca }]}>
          <MaterialCommunityIcons name={icono} size={22} color={colors.textoSobreColor} />
        </View>
        <View style={styles.textos}>
          <Text style={styles.nombre} numberOfLines={1}>
            {tarjeta?.nombre}
          </Text>
          <Text style={styles.subtitulo} numberOfLines={1}>
            {subtituloTarjeta(tarjeta)}
          </Text>
        </View>
        <View style={styles.columnaMonto}>
          <Text style={styles.monto} numberOfLines={1}>
            {formatearMonto(totalMes)}
          </Text>
          <Text style={styles.etiquetaMes}>este mes</Text>
        </View>
      </View>

      {fechas ? (
        <View style={styles.filaInferior}>
          <View style={styles.pildora}>
            <MaterialCommunityIcons
              name="calendar-clock-outline"
              size={13}
              color={colors.textSecondary}
            />
            <Text style={styles.textoFechas} numberOfLines={1}>
              {fechas}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    tarjeta: {
      borderRadius: radios['2xl'],
      padding: espacios.md,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopColor: colors.borderTop,
      gap: espacios.sm + 4,
    },
    tarjetaOpaca: {
      backgroundColor: colors.card,
    },
    filaSuperior: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacios.sm + 4,
    },
    squircle: {
      width: 42,
      height: 42,
      borderRadius: radios.xl,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      shadowOpacity: 0.35,
      elevation: 4,
    },
    textos: {
      flex: 1,
      gap: 2,
    },
    nombre: {
      ...tipografia.bodyLg,
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
    },
    subtitulo: {
      ...tipografia.bodySm,
      fontFamily: fonts.monoMedium,
      color: colors.textSecondary,
    },
    columnaMonto: {
      alignItems: 'flex-end',
      flexShrink: 0,
    },
    monto: {
      ...tipografia.financialMetricMd,
      color: colors.text,
    },
    etiquetaMes: {
      ...tipografia.bodySm,
      fontSize: 11,
      color: colors.textSecondary,
    },
    filaInferior: {
      flexDirection: 'row',
      paddingTop: espacios.sm + 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    pildora: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: espacios.xs,
      borderRadius: radios.full,
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    textoFechas: {
      ...tipografia.labelCaps,
      textTransform: 'none',
      letterSpacing: 0,
      color: colors.textSecondary,
    },
  });
