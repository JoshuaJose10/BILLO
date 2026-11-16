import { StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { formatearMontoEnCaptura, partesMontoCaptura } from '../utils/formato';
import Etiqueta from './Etiqueta';
import TextoAnimado from './TextoAnimado';

const enteroAnimado = (v) => {
  'worklet';
  return String(Math.round(v));
};

// Contenedor "IMPORTE" (Stitch: nuevo_gasto_bottom_sheet y 08_nuevo_gasto_referencia):
// rounded-2xl p-3.5, en oscuro tinte violeta translúcido con borde luminoso y en claro tarjeta
// blanca con sombra suave. Línea con items-baseline: "$" 30 mono, entero 48 bold tracking-tighter
// y decimales 30 mono medium. Vacío: "$0.00" todo en gris.
// `etiqueta`: el título de arriba ("Importe" en gastos, "Límite" en presupuestos).
// `valor` (demo del onboarding, HU-93): shared value con el que el entero cuenta en el hilo de UI
// hasta el de `texto`, que reserva el ancho para que la línea no se mueva.
export default function MontoGrande({
  texto,
  valor,
  error = false,
  etiqueta = 'Importe',
  moneda = 'MXN',
}) {
  const styles = useEstilos(crearEstilos);
  const { entero, decimales } = partesMontoCaptura(texto);
  const signo = moneda === 'EUR' ? '€' : moneda === 'GBP' ? '£' : moneda === 'JPY' ? '¥' : '$';

  return (
    <View style={[styles.contenedor, error ? styles.contenedorError : null]}>
      <Etiqueta style={styles.etiqueta}>{etiqueta}</Etiqueta>
      {valor ? (
        <View
          style={styles.lineaAnimada}
          accessible
          accessibilityLabel={`Importe ${formatearMontoEnCaptura(texto)} ${moneda}`}
        >
          <Text style={styles.signo}>{signo}</Text>
          <View>
            <Text style={[styles.entero, styles.reserva]}>{entero}</Text>
            <TextoAnimado
              valor={valor}
              formatear={enteroAnimado}
              style={[styles.entero, styles.contador]}
            />
          </View>
          <Text style={styles.decimales}>.{decimales}</Text>
        </View>
      ) : (
        <Text
          style={styles.linea}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLabel={`Importe ${formatearMontoEnCaptura(texto)} ${moneda}`}
        >
          <Text style={styles.signo}>{signo}</Text>
          <Text style={[styles.entero, texto ? null : styles.vacio]}>{entero}</Text>
          <Text style={styles.decimales}>.{decimales}</Text>
          {moneda && moneda !== 'MXN' ? <Text style={styles.codigoMoneda}> {moneda}</Text> : null}
        </Text>
      )}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    contenedor: {
      width: '100%',
      alignItems: 'center',
      padding: 14,
      borderRadius: radios['2xl'],
      backgroundColor: colors.montoFondo,
      borderWidth: 1,
      borderColor: colors.montoBorde,
      // En claro queda en ~4% (el alfa de `sombra` se multiplica); en oscuro casi no se ve.
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      shadowOpacity: 0.3,
    },
    contenedorError: {
      borderColor: colors.alerta,
    },
    // text-[10px] font-mono tracking-widest uppercase text-zinc-400 mb-1
    etiqueta: {
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: 1,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    linea: {
      fontFamily: fonts.sans,
      textAlign: 'center',
      fontSize: 48,
      lineHeight: 52,
    },
    lineaAnimada: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
    },
    // Ancho del monto final; el contador va encima, alineado a la derecha.
    reserva: {
      opacity: 0,
    },
    contador: {
      position: 'absolute',
      top: 0,
      right: 0,
      textAlign: 'right',
    },
    // text-3xl text-zinc-400 font-light mr-1 font-mono (JetBrains Light no se carga: Regular)
    signo: {
      fontFamily: fonts.mono,
      fontSize: 30,
      color: colors.textSecondary,
    },
    // text-5xl font-bold tracking-tighter
    entero: {
      fontFamily: fonts.sansBold,
      fontSize: 48,
      letterSpacing: -2.4,
      color: colors.text,
    },
    vacio: {
      color: colors.textSecondary,
    },
    // text-3xl text-zinc-400 font-medium font-mono
    decimales: {
      fontFamily: fonts.monoMedium,
      fontSize: 30,
      color: colors.textSecondary,
    },
    codigoMoneda: {
      fontFamily: fonts.monoMedium,
      fontSize: 20,
      color: colors.textSecondary,
    },
  });
