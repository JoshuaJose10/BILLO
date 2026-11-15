import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
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
import { accionBajoDedo, posicionesAbanico, radioAbanico } from '../utils/abanico';

// Abanico de acciones sobre un botón (HU-92; Stitch inicio_men_radial_modo_oscuro y _claro):
// mantener presionado ~300 ms lo abre y, sin soltar, se desliza hasta una acción. Soltar sobre una
// acción llama a onElegir(accion); fuera de todas o sobre el botón, solo se cierra.
//   const abanico = useGestoAbanico({
//     acciones, onElegir, tamanoBoton, altoInferior, reducirMovimiento,
//   });
//   <GestureDetector gesture={abanico.gesto}>…botón…</GestureDetector>
//   <AbanicoAcciones {...abanico} />  // capa a pantalla completa, detrás de la barra
// acciones: [{ clave, icono (MaterialCommunityIcons), etiqueta }]. El gesto corre en el hilo de UI.
// El arco no depende de dónde esté el botón: va centrado en la pantalla y por encima de
// `altoInferior` (lo que ocupa la barra desde el borde inferior). Solo la línea punteada sale del
// botón. La capa empieza en la esquina de la pantalla, así que sus coordenadas son las del gesto.

const MANTENER_MS = 300;
const RADIO = 140;
// Abre hacia arriba (270 = arriba); no llega a medio círculo.
const ANGULO_INICIO = 200;
const ANGULO_FIN = 340;
// Distancia máxima del dedo a una acción para elegirla; igual de cerca del botón, no elige nada.
const TOLERANCIA = 40;
const CIRCULO = 44;
const ESCALA_ACTIVA = 56 / CIRCULO;
// Radio del círculo ya agrandado (bajo el dedo): lo más que ocupa una acción desde su centro.
const RADIO_ACTIVA = (CIRCULO * ESCALA_ACTIVA) / 2;
const PASTILLA_MAX = 160;
// Del borde de la pantalla a la acción (o a la pastilla) y de la acción más baja a la barra.
const SEPARACION = 16;
const APARECER = { duration: 160 };
const RESALTAR = { duration: 120 };

const vibrar = (promesa) => promesa.catch(() => {});
const vibrarAbrir = () => vibrar(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
const vibrarCambio = () => vibrar(Haptics.selectionAsync());

export function useGestoAbanico({
  acciones,
  onElegir,
  tamanoBoton,
  altoInferior,
  reducirMovimiento,
}) {
  const ventana = useWindowDimensions();
  // Tamaño real de la capa (onLayout); antes de medirla, el de la ventana.
  const [capa, setCapa] = useState(null);
  const { width: ancho, height: alto } = capa ?? ventana;
  const alMedir = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== ancho || height !== alto) setCapa({ width, height });
  };
  const n = acciones.length;
  const arco = useMemo(
    () => ({
      ancho,
      base: alto - altoInferior - SEPARACION - RADIO_ACTIVA,
      radioMax: RADIO,
      margen: SEPARACION + RADIO_ACTIVA,
      anguloInicio: ANGULO_INICIO,
      anguloFin: ANGULO_FIN,
    }),
    [ancho, alto, altoInferior],
  );
  const posiciones = useMemo(() => posicionesAbanico(n, arco), [n, arco]);
  // abierto: 0 cerrado → 1 abierto. activo: índice bajo el dedo o -1. boton: centro del botón.
  const abierto = useSharedValue(0);
  const activo = useSharedValue(-1);
  const botonX = useSharedValue(0);
  const botonY = useSharedValue(0);
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
      botonX.set(e.absoluteX - e.x + mitad);
      botonY.set(e.absoluteY - e.y + mitad);
      activo.set(-1);
      abierto.set(reducirMovimiento ? 1 : withTiming(1, APARECER));
      scheduleOnRN(vibrarAbrir);
    },
    onUpdate: (e) => {
      'worklet';
      const dedo = { x: e.absoluteX, y: e.absoluteY };
      const boton = { x: botonX.get(), y: botonY.get() };
      const indice = accionBajoDedo(dedo, posiciones, TOLERANCIA, boton) ?? -1;
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
    arco,
    alMedir,
    abierto,
    activo,
    botonX,
    botonY,
    reducirMovimiento,
  };
}

const AnimatedLine = Animated.createAnimatedComponent(Line);

export default function AbanicoAcciones({
  acciones,
  posiciones,
  arco,
  alMedir,
  abierto,
  activo,
  botonX,
  botonY,
  reducirMovimiento,
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const { trazo, cima } = useMemo(() => {
    const radio = radioAbanico(arco);
    const [a, b] = posicionesAbanico(2, arco);
    return {
      trazo: `M ${a.x} ${a.y} A ${radio} ${radio} 0 0 1 ${b.x} ${b.y}`,
      cima: posicionesAbanico(1, arco)[0].y,
    };
  }, [arco]);

  const estiloCapa = useAnimatedStyle(() => ({ opacity: abierto.get() }));
  // Línea punteada del botón (donde esté) a la acción bajo el dedo.
  const propsLinea = useAnimatedProps(() => {
    const p = posiciones[activo.get()];
    const x1 = botonX.get();
    const y1 = botonY.get();
    return p
      ? { x1, y1, x2: p.x, y2: p.y, strokeOpacity: 0.55 }
      : { x1, y1, x2: x1, y2: y1, strokeOpacity: 0 };
  });

  if (acciones.length === 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={alMedir}
      style={[StyleSheet.absoluteFill, estiloCapa]}
    >
      <View style={[StyleSheet.absoluteFill, styles.velo]} />
      <Svg style={StyleSheet.absoluteFill}>
        <Path
          d={trazo}
          stroke={colors.text}
          strokeOpacity={0.2}
          strokeDasharray="3 5"
          strokeWidth={1}
          fill="none"
        />
        <AnimatedLine
          stroke={colors.text}
          strokeDasharray="2 3"
          strokeWidth={1.5}
          animatedProps={propsLinea}
        />
      </Svg>
      <View style={[styles.filaPista, { top: cima - CIRCULO * 2 - 16 }]}>
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
          ancho={arco.ancho}
          indice={indice}
          activo={activo}
          reducirMovimiento={reducirMovimiento}
        />
      ))}
    </Animated.View>
  );
}

// En reposo solo el ícono. Bajo el dedo crece con el círculo resaltado (claro sobre oscuro y
// viceversa) y su nombre sale en una pastilla encima, hacia afuera del arco (abre hacia arriba),
// recorrida de lado lo necesario para quedar dentro de la pantalla.
function Accion({ accion, posicion, ancho, indice, activo, reducirMovimiento }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const [anchoPastilla, setAnchoPastilla] = useState(0);
  const izquierda = Math.min(
    Math.max(posicion.x - anchoPastilla / 2, SEPARACION),
    ancho - SEPARACION - anchoPastilla,
  );

  const estiloCirculo = useAnimatedStyle(() => {
    const escala = activo.get() === indice ? ESCALA_ACTIVA : 1;
    return {
      transform: [{ scale: reducirMovimiento ? escala : withTiming(escala, RESALTAR) }],
    };
  });
  const estiloActiva = useAnimatedStyle(() => ({ opacity: activo.get() === indice ? 1 : 0 }));

  return (
    <View
      style={[styles.accion, { left: posicion.x - CIRCULO / 2, top: posicion.y - CIRCULO / 2 }]}
    >
      <Animated.View
        style={[styles.filaPastilla, { left: izquierda - posicion.x + CIRCULO / 2 }, estiloActiva]}
      >
        <View
          style={styles.pastilla}
          onLayout={(e) => setAnchoPastilla(e.nativeEvent.layout.width)}
        >
          <MaterialCommunityIcons name={accion.icono} size={13} color={colors.onPrimary} />
          <Text style={styles.pastillaTexto} numberOfLines={1}>
            {accion.etiqueta}
          </Text>
        </View>
      </Animated.View>
      <Animated.View style={[styles.circulo, estiloCirculo]}>
        <MaterialCommunityIcons name={accion.icono} size={20} color={colors.text} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.circuloActivo, estiloActiva]}>
          <MaterialCommunityIcons name={accion.icono} size={20} color={colors.onPrimary} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // El mismo vidrio de la barra: bg-background/70 en oscuro y #f5f5f7/75 en claro.
    velo: {
      backgroundColor: colors.navbar,
    },
    // Centrada en la pantalla, sobre el arco
    filaPista: {
      position: 'absolute',
      left: 0,
      right: 0,
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
    // Por encima del círculo ya agrandado; `left` la deja dentro de la pantalla.
    filaPastilla: {
      position: 'absolute',
      bottom: '100%',
      marginBottom: 12,
      width: PASTILLA_MAX,
      alignItems: 'flex-start',
    },
    // mb-2 px-3 py-1 rounded-full bg-primary
    pastilla: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: PASTILLA_MAX,
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
