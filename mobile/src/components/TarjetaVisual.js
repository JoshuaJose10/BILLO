import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { espacios, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { caraTarjeta, degradadoTarjeta } from '../theme/tarjetas';
import { useEstilos, useTema } from '../theme/TemaContext';
import { etiquetaAccesibleTarjeta, etiquetaTipoTarjeta, lineaCaraTarjeta } from '../utils/tarjetas';

// Cara de una tarjeta (Stitch 14_cartera_tarjetas_*), en proporción real (1.586): gradiente por
// tipo (theme/tarjetas.js), «Billo» con la insignia CRÉDITO/DÉBITO, contactless, chip, nombre de la
// tarjeta, •••• últimos 4, `titular` y «CORTE 12 · PAGO 2» o «DÉBITO».
// `tamano`: 'normal' (ancho completo, Cartera) o 'mini' (128 px, pila de Inicio: chip,
// contactless y •••• 4419, como en 07_inicio_*).
export default function TarjetaVisual({ tarjeta, titular, tamano = 'normal', style }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const mini = tamano === 'mini';
  const credito = tarjeta?.tipo !== 'debito';
  const linea = mini ? null : lineaCaraTarjeta(tarjeta);
  const colorLineaChip = credito ? caraTarjeta.lineaChip : caraTarjeta.textoSuave;

  const chip = (
    <LinearGradient
      colors={credito ? caraTarjeta.chip : [caraTarjeta.vidrio, caraTarjeta.vidrio]}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={mini ? styles.chipMini : styles.chip}
    >
      {mini
        ? null
        : [0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.lineaChip,
                { backgroundColor: colorLineaChip },
                i === 2 && styles.corta,
              ]}
            />
          ))}
    </LinearGradient>
  );

  return (
    <LinearGradient
      colors={degradadoTarjeta(tarjeta)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cara, mini ? styles.caraMini : null, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={etiquetaAccesibleTarjeta(tarjeta)}
    >
      <LinearGradient colors={caraTarjeta.brillo} style={styles.brillo} pointerEvents="none" />
      <View style={styles.fila}>
        {mini ? (
          chip
        ) : (
          <View style={styles.marca}>
            <Text style={styles.billo}>Billo</Text>
            <Text style={styles.insignia}>{etiquetaTipoTarjeta(tarjeta?.tipo).toUpperCase()}</Text>
          </View>
        )}
        <MaterialCommunityIcons
          name="contactless-payment"
          size={mini ? 13 : 20}
          color={colors.textoSobreColor}
        />
      </View>
      {mini ? null : (
        <View style={styles.fila}>
          {chip}
          <Text style={styles.suave} numberOfLines={1}>
            {String(tarjeta?.nombre ?? '').toUpperCase()}
          </Text>
        </View>
      )}
      <View style={[styles.fila, styles.filaFinal]}>
        <View>
          <Text style={mini ? styles.numeroMini : styles.numero}>•••• {tarjeta?.ultimos4}</Text>
          {!mini && titular ? <Text style={styles.titular}>{titular}</Text> : null}
        </View>
        {linea ? <Text style={styles.linea}>{linea}</Text> : null}
      </View>
    </LinearGradient>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    cara: {
      width: '100%',
      aspectRatio: 1.586,
      borderRadius: radios['2xl'],
      padding: 20,
      justifyContent: 'space-between',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: caraTarjeta.borde,
    },
    caraMini: {
      width: 128,
      padding: 10,
    },
    brillo: {
      ...StyleSheet.absoluteFillObject,
      bottom: '50%',
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: espacios.sm,
    },
    filaFinal: {
      alignItems: 'flex-end',
    },
    marca: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacios.sm,
    },
    billo: {
      fontFamily: fonts.sansBold,
      fontSize: 17,
      letterSpacing: -0.3,
      color: colors.textoSobreColor,
    },
    insignia: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      letterSpacing: 1,
      color: colors.textoSobreColor,
      backgroundColor: caraTarjeta.vidrio,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radios.sm,
      overflow: 'hidden',
    },
    chip: {
      width: 44,
      height: 32,
      borderRadius: 6,
      padding: 6,
      justifyContent: 'space-around',
    },
    chipMini: {
      width: 16,
      height: 12,
      borderRadius: 3,
    },
    lineaChip: {
      height: 2,
      borderRadius: 1,
    },
    corta: {
      width: '66%',
    },
    suave: {
      flexShrink: 1,
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: 2,
      color: caraTarjeta.textoSuave,
    },
    numero: {
      fontFamily: fonts.monoSemiBold,
      fontSize: 18,
      letterSpacing: 1.5,
      color: colors.textoSobreColor,
    },
    numeroMini: {
      fontFamily: fonts.monoBold,
      fontSize: 9,
      letterSpacing: 1,
      color: colors.textoSobreColor,
    },
    titular: {
      marginTop: espacios.xs,
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: 1,
      color: caraTarjeta.textoSuave,
    },
    linea: {
      fontFamily: fonts.monoSemiBold,
      fontSize: 12,
      color: colors.textoSobreColor,
    },
  });
