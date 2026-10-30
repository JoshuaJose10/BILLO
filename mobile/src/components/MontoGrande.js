import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colorCategoria } from '../theme/categorias';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { formatearMontoEnCaptura, partesMontoCaptura } from '../utils/formato';
import Etiqueta from './Etiqueta';

// Radio interior de la tarjeta (el borde de 1px queda por fuera del halo).
const RADIO_HALO = radios['2xl'] - 1;

// Animación del halo: crossfade entre dos capas y un "respiro" de escala en la nueva.
const FUNDIDO = { duration: 300, easing: Easing.out(Easing.cubic) };
const FUNDIDO_REDUCIDO = { duration: 150, easing: Easing.out(Easing.cubic) };
const RESPIRO = { duration: 175, easing: Easing.out(Easing.cubic) };
const ESCALA_RESPIRO = 1.06;

// Dos capas fijas (0 y 1): la del color nuevo aparece y la del anterior se desvanece. Cada capa
// guarda su color en estado; opacidad y escala son shared values, así la animación corre en el
// hilo de UI sin re-renders por frame. Con cambios rápidos la capa que se reutiliza es siempre
// la que se está apagando: se pone en 0 antes de recibir el color nuevo, así ninguna capa queda
// trabada ni cambia de color mientras se ve.
function useHaloAnimado(colorHalo) {
  const reducirMovimiento = useReducedMotion();
  const [colores, setColores] = useState([null, null]);
  const activa = useRef(null); // índice de la capa con el color actual, o null sin halo
  const opacidad0 = useSharedValue(0);
  const opacidad1 = useSharedValue(0);
  const escala0 = useSharedValue(1);
  const escala1 = useSharedValue(1);

  useEffect(() => {
    const opacidades = [opacidad0, opacidad1];
    const escalas = [escala0, escala1];
    const fundido = reducirMovimiento ? FUNDIDO_REDUCIDO : FUNDIDO;
    const anterior = activa.current;

    if (!colorHalo) {
      if (anterior !== null) opacidades[anterior].set(withTiming(0, fundido));
      activa.current = null;
      return;
    }

    const nueva = anterior === 0 ? 1 : 0;
    cancelAnimation(opacidades[nueva]);
    cancelAnimation(escalas[nueva]);
    opacidades[nueva].set(0);
    escalas[nueva].set(1);
    setColores((actuales) => {
      const siguientes = [...actuales];
      siguientes[nueva] = colorHalo;
      return siguientes;
    });
    opacidades[nueva].set(withTiming(1, fundido));
    if (anterior !== null) {
      opacidades[anterior].set(withTiming(0, fundido));
      if (!reducirMovimiento) {
        escalas[nueva].set(
          withSequence(withTiming(ESCALA_RESPIRO, RESPIRO), withTiming(1, RESPIRO)),
        );
      }
    }
    activa.current = nueva;
    // Solo reacciona al cambio de color; reducirMovimiento se lee en el momento del cambio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorHalo]);

  return [
    { color: colores[0], opacidad: opacidad0, escala: escala0 },
    { color: colores[1], opacidad: opacidad1, escala: escala1 },
  ];
}

// Una capa del halo: degradado radial del color con su opacidad y escala animadas. Unidades
// relativas a la tarjeta: el círculo se estira a una elipse del ancho del importe.
function CapaHalo({ id, color, opacidad, escala }) {
  const { colors } = useTema();
  const estilo = useAnimatedStyle(() => ({
    opacity: opacidad.value,
    transform: [{ scale: escala.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, estilo]} pointerEvents="none">
      {color ? (
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={id} cx="0.5" cy="0.6" r="0.5">
              <Stop offset="0" stopColor={color} stopOpacity={colors.haloImporteOpacidad} />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </Animated.View>
  );
}

// Contenedor "IMPORTE" (Stitch: nuevo_gasto_bottom_sheet y 08_nuevo_gasto_referencia):
// rounded-2xl p-3.5, en oscuro tinte violeta translúcido con borde luminoso y en claro tarjeta
// blanca con sombra suave. Línea con items-baseline: "$" 30 mono, entero 48 bold tracking-tighter
// y decimales 30 mono medium. Vacío: "$0.00" todo en gris.
// `categoria` (nombre): halo radial de su color detrás del importe, que cambia con un crossfade;
// sin categoría no hay halo.
export default function MontoGrande({ texto, error = false, categoria }) {
  const { esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const { entero, decimales } = partesMontoCaptura(texto);
  const capas = useHaloAnimado(categoria ? colorCategoria(categoria, esOscuro) : null);

  return (
    <View style={[styles.contenedor, error ? styles.contenedorError : null]}>
      {/* Recorta el halo al radio de la tarjeta (también durante el respiro de escala) sin
          recortar la sombra de la tarjeta. */}
      <View style={styles.halo} pointerEvents="none">
        {capas.map((capa, i) => (
          <CapaHalo key={i} id={`haloImporte${i}`} {...capa} />
        ))}
      </View>
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
    halo: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: RADIO_HALO,
      overflow: 'hidden',
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
