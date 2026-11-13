import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { accionBajoDedo, posicionesAbanico } from '../utils/abanico';

// Abanico de acciones sobre un botón (HU-92; Stitch inicio_men_radial_modo_oscuro y _claro):
// mantener presionado ~300 ms lo abre y, sin soltar, se desliza hasta una acción. Soltar sobre una
// acción llama a onElegir(accion); fuera de todas o sobre el botón, solo se cierra.
//   const abanico = useGestoAbanico({ acciones, onElegir, tamanoBoton, reducirMovimiento });
//   <GestureDetector gesture={abanico.gesto}>…botón…</GestureDetector>
//   <AbanicoAcciones {...abanico} />  // capa a pantalla completa, detrás de la barra
// acciones: [{ clave, icono (MaterialCommunityIcons), etiqueta }]. El gesto corre en el hilo de UI.

const MANTENER_MS = 300;
const RADIO = 140;
// Espacio libre entre la acción de un extremo y el borde de la pantalla (cabe su etiqueta).
const MARGEN_RADIO = 56;
const ANGULO_INICIO = 160;
const ANGULO_FIN = 20;
// Distancia máxima del dedo a una acción para elegirla; igual de cerca del botón, no elige nada.
const TOLERANCIA = 40;
const CIRCULO = 44;
const ESCALA_ACTIVA = 56 / CIRCULO;
const ANCHO_ACCION = 96;
const APARECER = { duration: 160 };
const RESALTAR = { duration: 120 };

const vibrar = (promesa) => promesa.catch(() => {});
const vibrarAbrir = () => vibrar(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
const vibrarCambio = () => vibrar(Haptics.selectionAsync());

export function useGestoAbanico({ acciones, onElegir, tamanoBoton, reducirMovimiento }) {
  const { width } = useWindowDimensions();
  const radio = Math.min(RADIO, width / 2 - MARGEN_RADIO);
  const n = acciones.length;
  const posiciones = useMemo(
    () => posicionesAbanico(n, radio, ANGULO_INICIO, ANGULO_FIN),
    [n, radio],
  );
  // abierto: 0 cerrado → 1 abierto. activo: índice bajo el dedo o -1. centro: el del botón en la
  // pantalla (la capa del abanico ocupa toda la pantalla desde 0,0).
  const abierto = useSharedValue(0);
  const activo = useSharedValue(-1);
  const centroX = useSharedValue(0);
  const centroY = useSharedValue(0);
  const mitad = tamanoBoton / 2;

  const soltar = (indice) => {
    vibrar(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    if (indice >= 0 && acciones[indice]) onElegir?.(acciones[indice]);
  };

  const gesto = usePanGesture({
    activateAfterLongPress: MANTENER_MS,
    enabled: n > 0,
    onActivate: (e) => {
      'worklet';
      centroX.set(e.absoluteX - e.x + mitad);
      centroY.set(e.absoluteY - e.y + mitad);
      activo.set(-1);
      abierto.set(reducirMovimiento ? 1 : withTiming(1, APARECER));
      scheduleOnRN(vibrarAbrir);
    },
    onUpdate: (e) => {
      'worklet';
      const punto = { x: e.x - mitad, y: e.y - mitad };
      const indice = accionBajoDedo(punto, posiciones, TOLERANCIA) ?? -1;
      if (indice === activo.get()) return;
      activo.set(indice);
      if (indice >= 0) scheduleOnRN(vibrarCambio);
    },
    onDeactivate: (e) => {
      'worklet';
      const indice = e.canceled ? -1 : activo.get();
      activo.set(-1);
      abierto.set(reducirMovimiento ? 0 : withTiming(0, APARECER));
      scheduleOnRN(soltar, indice);
    },
  });

  return {
    gesto,
    acciones,
    posiciones,
    radio,
    abierto,
    activo,
    centroX,
    centroY,
    reducirMovimiento,
  };
}

const AnimatedLine = Animated.createAnimatedComponent(Line);

export default function AbanicoAcciones({
  acciones,
  posiciones,
  radio,
  abierto,
  activo,
  centroX,
  centroY,
  reducirMovimiento,
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const lado = 2 * (radio + CIRCULO);
  const mitad = lado / 2;
  const arco = useMemo(() => {
    const [a, b] = posicionesAbanico(2, radio, ANGULO_INICIO + 8, ANGULO_FIN - 8);
    return `M ${a.x + mitad} ${a.y + mitad} A ${radio} ${radio} 0 0 1 ${b.x + mitad} ${b.y + mitad}`;
  }, [radio, mitad]);

  const estiloCapa = useAnimatedStyle(() => ({ opacity: abierto.get() }));
  const estiloCentro = useAnimatedStyle(() => ({
    transform: [{ translateX: centroX.get() }, { translateY: centroY.get() }],
  }));
  // Línea punteada del botón a la acción bajo el dedo.
  const propsLinea = useAnimatedProps(() => {
    const p = posiciones[activo.get()];
    return p
      ? { x2: p.x + mitad, y2: p.y + mitad, strokeOpacity: 0.55 }
      : { x2: mitad, y2: mitad, strokeOpacity: 0 };
  });

  if (acciones.length === 0) return null;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, estiloCapa]}>
      <View style={[StyleSheet.absoluteFill, styles.velo]} />
      {/* Origen de coordenadas en el centro del botón: todo lo de adentro es relativo a él. */}
      <Animated.View style={[styles.origen, estiloCentro]}>
        <Svg width={lado} height={lado} style={[styles.trazos, { left: -mitad, top: -mitad }]}>
          <Path
            d={arco}
            stroke={colors.text}
            strokeOpacity={0.2}
            strokeDasharray="3 5"
            strokeWidth={1}
            fill="none"
          />
          <AnimatedLine
            x1={mitad}
            y1={mitad}
            stroke={colors.text}
            strokeDasharray="2 3"
            strokeWidth={1.5}
            animatedProps={propsLinea}
          />
        </Svg>
        <View style={[styles.filaPista, { top: -radio - CIRCULO * 2 - 16 }]}>
          <View style={styles.pista}>
            <MaterialCommunityIcons name="gesture-tap-hold" size={15} color={colors.text} />
            <Text style={styles.pistaTexto}>Desliza y suelta</Text>
          </View>
        </View>
        {acciones.map((accion, indice) => (
          <Accion
            key={accion.clave}
            accion={accion}
            posicion={posiciones[indice]}
            indice={indice}
            activo={activo}
            reducirMovimiento={reducirMovimiento}
          />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

// Inactiva: círculo de superficie y su nombre debajo. Bajo el dedo: crece con el círculo
// resaltado (claro sobre oscuro y viceversa), su nombre arriba en una pastilla y
// «Soltar para abrir» debajo.
function Accion({ accion, posicion, indice, activo, reducirMovimiento }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  const estiloCirculo = useAnimatedStyle(() => {
    const escala = activo.get() === indice ? ESCALA_ACTIVA : 1;
    return {
      transform: [{ scale: reducirMovimiento ? escala : withTiming(escala, RESALTAR) }],
    };
  });
  const estiloActiva = useAnimatedStyle(() => ({ opacity: activo.get() === indice ? 1 : 0 }));
  const estiloInactiva = useAnimatedStyle(() => ({ opacity: activo.get() === indice ? 0 : 1 }));

  return (
    <View
      style={[
        styles.accion,
        { left: posicion.x - ANCHO_ACCION / 2, top: posicion.y - CIRCULO / 2 },
      ]}
    >
      <Animated.View style={[styles.pastilla, estiloActiva]}>
        <MaterialCommunityIcons name={accion.icono} size={13} color={colors.onPrimary} />
        <Text style={styles.pastillaTexto} numberOfLines={1}>
          {accion.etiqueta}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.circulo, estiloCirculo]}>
        <MaterialCommunityIcons name={accion.icono} size={20} color={colors.text} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.circuloActivo, estiloActiva]}>
          <MaterialCommunityIcons name={accion.icono} size={20} color={colors.onPrimary} />
        </Animated.View>
      </Animated.View>
      <View>
        <Animated.Text style={[styles.etiqueta, estiloInactiva]} numberOfLines={1}>
          {accion.etiqueta}
        </Animated.Text>
        <Animated.Text style={[styles.soltar, StyleSheet.absoluteFill, estiloActiva]}>
          Soltar para abrir
        </Animated.Text>
      </View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // El mismo vidrio de la barra: bg-background/70 en oscuro y #f5f5f7/75 en claro.
    velo: {
      backgroundColor: colors.navbar,
    },
    origen: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    },
    trazos: {
      position: 'absolute',
    },
    // Centrada sobre el arco
    filaPista: {
      position: 'absolute',
      left: -ANCHO_ACCION,
      width: ANCHO_ACCION * 2,
      alignItems: 'center',
    },
    // px-3.5 py-1.5 rounded-full bg-surface-container-high
    pista: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHigh,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      shadowOpacity: 0.3,
    },
    pistaTexto: {
      ...tipografia.labelCaps,
      color: colors.text,
    },
    accion: {
      position: 'absolute',
      width: ANCHO_ACCION,
      alignItems: 'center',
    },
    circulo: {
      width: CIRCULO,
      height: CIRCULO,
      borderRadius: CIRCULO / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      shadowOpacity: 0.3,
      elevation: 4,
    },
    // bg-primary con halo (blanco en oscuro, sombra oscura en claro)
    circuloActivo: {
      borderRadius: CIRCULO / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      shadowColor: colors.brillo,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 14,
      shadowOpacity: 0.5,
    },
    // mt-1.5 text-[10px] uppercase tracking-wider text-on-surface-variant
    etiqueta: {
      ...tipografia.labelCaps,
      fontSize: 10,
      marginTop: 6,
      color: colors.textVariant,
      textAlign: 'center',
    },
    // text-[9px] tracking-widest, debajo del círculo ya agrandado
    soltar: {
      ...tipografia.labelCaps,
      fontSize: 9,
      marginTop: 12,
      color: colors.text,
      textAlign: 'center',
    },
    // mb-2 px-3 py-1 rounded-full bg-primary, por encima del círculo ya agrandado
    pastilla: {
      position: 'absolute',
      bottom: '100%',
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: ANCHO_ACCION * 1.6,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: radios.full,
      backgroundColor: colors.primary,
    },
    pastillaTexto: {
      ...tipografia.labelCaps,
      color: colors.onPrimary,
      flexShrink: 1,
    },
  });
