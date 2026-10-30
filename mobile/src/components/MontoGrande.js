import { StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { formatearMontoEnCaptura, partesMontoCaptura } from '../utils/formato';
import Etiqueta from './Etiqueta';

// Contenedor "IMPORTE" (Stitch: nuevo_gasto_bottom_sheet). rounded-2xl bg-white/[0.04]
// border-white/10 p-3.5. Línea con items-baseline: "$" 30 mono zinc-400, entero 48 bold
// tracking-tighter blanco y decimales 30 mono medium zinc-400. Vacío: "$0.00" todo en gris.
export default function MontoGrande({ texto, error = false }) {
  const styles = useEstilos(crearEstilos);
  const { entero, decimales } = partesMontoCaptura(texto);

  return (
    <View style={[styles.contenedor, error ? styles.contenedorError : null]}>
      <Etiqueta style={styles.etiqueta}>Importe</Etiqueta>
      <Text
        style={styles.linea}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityLabel={`Importe ${formatearMontoEnCaptura(texto)}`}
      >
        <Text style={styles.signo}>$</Text>
        <Text style={[styles.entero, texto ? null : styles.vacio]}>{entero}</Text>
        <Text style={styles.decimales}>.{decimales}</Text>
      </Text>
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
      backgroundColor: colors.glass04,
      borderWidth: 1,
      borderColor: colors.borderStrong,
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
  });
