import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colorCategoria } from '../theme/categorias';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { formatearMontoEnCaptura, partesMontoCaptura } from '../utils/formato';
import Etiqueta from './Etiqueta';

// Radio interior de la tarjeta (el borde de 1px queda por fuera del halo).
const RADIO_HALO = radios['2xl'] - 1;

// Contenedor "IMPORTE" (Stitch: nuevo_gasto_bottom_sheet y 08_nuevo_gasto_referencia):
// rounded-2xl p-3.5, en oscuro tinte violeta translúcido con borde luminoso y en claro tarjeta
// blanca con sombra suave. Línea con items-baseline: "$" 30 mono, entero 48 bold tracking-tighter
// y decimales 30 mono medium. Vacío: "$0.00" todo en gris.
// `categoria` (nombre): halo radial de su color detrás del importe; sin categoría no hay halo.
export default function MontoGrande({ texto, error = false, categoria }) {
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const { entero, decimales } = partesMontoCaptura(texto);
  const colorHalo = categoria ? colorCategoria(categoria, esOscuro) : null;

  return (
    <View style={[styles.contenedor, error ? styles.contenedorError : null]}>
      {colorHalo ? (
        // Unidades relativas a la tarjeta: el círculo se estira a una elipse del ancho del importe.
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
          <Defs>
            <RadialGradient id="haloImporte" cx="0.5" cy="0.6" r="0.5">
              <Stop offset="0" stopColor={colorHalo} stopOpacity={colors.haloImporteOpacidad} />
              <Stop offset="1" stopColor={colorHalo} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect
            width="100%"
            height="100%"
            rx={RADIO_HALO}
            ry={RADIO_HALO}
            fill="url(#haloImporte)"
          />
        </Svg>
      ) : null}
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
