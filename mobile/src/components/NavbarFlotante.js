import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Fragment, useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';

// Medidas del <nav> de Stitch (inicio_navbar_p_ldora_modo_oscuro): px-2 py-2, borde 1px,
// botón central de 44 → alto 62. Activa: py-2 + ícono 18 → 34. Inactiva: p-2.5 + ícono 20.
const ALTO = 62;
const MARGEN = 16;
const BORDE = 1;
const PADDING_BARRA = 8;
const ICONO_ACTIVO = 18;
const ICONO_INACTIVO = 20;
const ICONO_CENTRAL = 24;
const ALTO_CAPSULA = 34;

// El ícono se dibuja como texto con la fuente de MaterialCommunityIcons para poder animar
// su color. Esa fuente mide exactamente 1 em (ascent 448 + descent 64 = 512), así que la
// caja del texto mide lo mismo que el ícono y el glifo queda centrado sin lineHeight.
const FUENTE_ICONOS = MaterialCommunityIcons.getFontFamily();
const GLIFOS = MaterialCommunityIcons.getRawGlyphMap();
const glifo = (nombre) => String.fromCodePoint(GLIFOS[nombre] ?? GLIFOS['circle-outline']);

// Transiciones cortas y sin rebote (ease-out). Ajusta aquí si se sienten lentas o rápidas.
const DESLIZAR = { duration: 220, easing: Easing.out(Easing.cubic) };
const PRESIONAR = { duration: 90, easing: Easing.out(Easing.quad) };
const SOLTAR = { duration: 140, easing: Easing.out(Easing.quad) };
const DURACION_ETIQUETA = 150;
const ESCALA_PRESIONADO = 0.95;
const GIRO_CENTRAL = 90;

// Alto total que ocupa la barra desde el borde inferior (barra + margen + inset).
// Úsalo como paddingBottom del contenido de cada pestaña para que nada quede tapado.
export function useAlturaNavbar() {
  const insets = useSafeAreaInsets();
  return ALTO + MARGEN + insets.bottom;
}

// Rebote al presionar: escala a 0.95 y vuelve a 1. Sin animación si "Reducir movimiento".
function useRebote(reducirMovimiento) {
  const escala = useSharedValue(1);
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  const alPresionar = () => {
    if (!reducirMovimiento) escala.set(withTiming(ESCALA_PRESIONADO, PRESIONAR));
  };
  const alSoltar = () => {
    if (!reducirMovimiento) escala.set(withTiming(1, SOLTAR));
  };
  return { estilo, alPresionar, alSoltar };
}

// Barra de pestañas flotante tipo píldora. Se pasa en la prop `tabBar` del Tab.Navigator.
// De cada pantalla toma `options.tabBarIconName` (MaterialCommunityIcons) y
// `options.tabBarLabel` u `options.title`. `accionCentral` ({ icono, onPress,
// accessibilityLabel }) dibuja un botón en medio de las pestañas; es una acción, no una pestaña.
//
// Animación: un solo indicador blanco (absoluto, detrás de las pestañas) se desliza hasta la
// pestaña activa midiendo cada una con onLayout; las pestañas reacomodan su posición con una
// transición de layout porque la activa crece al mostrar su etiqueta.
export default function NavbarFlotante({ state, descriptors, navigation, accionCentral }) {
  const insets = useSafeAreaInsets();
  const reducirMovimiento = useReducedMotion();
  const { esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const posicionCentral = Math.ceil(state.routes.length / 2);
  const claveActiva = state.routes[state.index]?.key;

  // Posición y tamaño del indicador, relativos al interior (padding box) de la barra.
  const indX = useSharedValue(0);
  const indY = useSharedValue(0);
  const indAncho = useSharedValue(0);
  const indAlto = useSharedValue(0);
  const indVisible = useSharedValue(0);
  const colocado = useRef(false);

  const moverIndicador = useCallback(
    ({ x, y, width, height }) => {
      const destino = { x: x - BORDE, y: y - BORDE, width, height };
      // La primera vez (o con "Reducir movimiento") se coloca directo, sin animar desde cero.
      if (!colocado.current || reducirMovimiento) {
        indX.set(destino.x);
        indY.set(destino.y);
        indAncho.set(destino.width);
        indAlto.set(destino.height);
        indVisible.set(1);
        colocado.current = true;
        return;
      }
      indX.set(withTiming(destino.x, DESLIZAR));
      indAncho.set(withTiming(destino.width, DESLIZAR));
      indY.set(destino.y);
      indAlto.set(destino.height);
    },
    [reducirMovimiento, indX, indY, indAncho, indAlto, indVisible],
  );

  const estiloIndicador = useAnimatedStyle(() => ({
    opacity: indVisible.value,
    width: indAncho.value,
    height: indAlto.value,
    transform: [{ translateX: indX.value }, { translateY: indY.value }],
  }));

  const pestanas = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const activa = state.index === index;

    const alPresionar = () => {
      const evento = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!activa && !evento.defaultPrevented) {
        Haptics.selectionAsync().catch(() => {});
        navigation.navigate(route.name, route.params);
      }
    };

    const alMantener = () => navigation.emit({ type: 'tabLongPress', target: route.key });

    return (
      <Pestana
        key={route.key}
        activa={activa}
        etiqueta={options.tabBarLabel ?? options.title ?? route.name}
        icono={options.tabBarIconName ?? 'circle-outline'}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        reducirMovimiento={reducirMovimiento}
        onPress={alPresionar}
        onLongPress={alMantener}
        onLayout={(e) => {
          if (route.key === claveActiva) moverIndicador(e.nativeEvent.layout);
        }}
      />
    );
  });

  return (
    <View pointerEvents="box-none" style={[styles.contenedor, { bottom: MARGEN + insets.bottom }]}>
      {/* La sombra va en un contenedor externo porque la barra usa overflow: hidden (blur). */}
      <View style={styles.sombra}>
        <View style={styles.barra}>
          <BlurView
            tint={esOscuro ? 'dark' : 'light'}
            intensity={60}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.capa]} />
          <Animated.View pointerEvents="none" style={[styles.indicador, estiloIndicador]} />
          {pestanas.map((pestana, index) => (
            <Fragment key={state.routes[index].key}>
              {accionCentral && index === posicionCentral ? (
                <BotonCentral {...accionCentral} reducirMovimiento={reducirMovimiento} />
              ) : null}
              {pestana}
            </Fragment>
          ))}
          {accionCentral && posicionCentral >= pestanas.length ? (
            <BotonCentral {...accionCentral} reducirMovimiento={reducirMovimiento} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Pestana({
  activa,
  etiqueta,
  icono,
  accessibilityLabel,
  reducirMovimiento,
  onPress,
  onLongPress,
  onLayout,
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const colorInactivo = colors.textNav;
  const colorActivo = colors.onPrimary;
  const rebote = useRebote(reducirMovimiento);

  // 0 = inactiva, 1 = activa. Arranca en su valor final para que la primera pantalla no se anime.
  const progreso = useSharedValue(activa ? 1 : 0);
  useEffect(() => {
    const destino = activa ? 1 : 0;
    progreso.set(
      reducirMovimiento ? destino : withTiming(destino, { duration: DURACION_ETIQUETA }),
    );
  }, [activa, reducirMovimiento, progreso]);

  const estiloIcono = useAnimatedStyle(
    () => ({ color: interpolateColor(progreso.value, [0, 1], [colorInactivo, colorActivo]) }),
    [colorInactivo, colorActivo],
  );
  const estiloEtiqueta = useAnimatedStyle(() => ({
    opacity: progreso.value,
    transform: [{ translateX: 6 * (1 - progreso.value) }],
  }));

  return (
    <Animated.View
      onLayout={onLayout}
      layout={
        reducirMovimiento
          ? undefined
          : LinearTransition.duration(DESLIZAR.duration).easing(DESLIZAR.easing)
      }
      style={rebote.estilo}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={rebote.alPresionar}
        onPressOut={rebote.alSoltar}
        accessibilityRole="tab"
        accessibilityState={{ selected: activa }}
        accessibilityLabel={accessibilityLabel ?? etiqueta}
        hitSlop={activa ? { top: 6, bottom: 6 } : 3}
        style={activa ? styles.activa : styles.inactiva}
      >
        <Animated.Text
          style={[styles.icono, { fontSize: activa ? ICONO_ACTIVO : ICONO_INACTIVO }, estiloIcono]}
          accessible={false}
        >
          {glifo(icono)}
        </Animated.Text>
        {activa ? (
          <Animated.Text style={[styles.etiqueta, estiloEtiqueta]} numberOfLines={1}>
            {etiqueta}
          </Animated.Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function BotonCentral({ icono = 'plus', onPress, accessibilityLabel, reducirMovimiento }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const rebote = useRebote(reducirMovimiento);
  const giro = useSharedValue(0);
  const estiloIcono = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.value}deg` }] }));

  const alPresionar = () => {
    rebote.alPresionar();
    if (!reducirMovimiento) giro.set(withTiming(GIRO_CENTRAL, PRESIONAR));
  };
  const alSoltar = () => {
    rebote.alSoltar();
    if (!reducirMovimiento) giro.set(withTiming(0, SOLTAR));
  };
  const alTocar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };

  return (
    <Animated.View style={rebote.estilo}>
      <Pressable
        onPress={alTocar}
        onPressIn={alPresionar}
        onPressOut={alSoltar}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={styles.central}
      >
        <Animated.View style={estiloIcono}>
          <MaterialCommunityIcons name={icono} size={ICONO_CENTRAL} color={colors.onPrimary} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    contenedor: {
      position: 'absolute',
      left: MARGEN,
      right: MARGEN,
    },
    // shadow-2xl
    sombra: {
      borderRadius: 9999,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 25 },
      shadowRadius: 25,
      shadowOpacity: 0.25,
      elevation: 12,
    },
    barra: {
      height: ALTO,
      padding: PADDING_BARRA,
      borderRadius: 9999,
      borderWidth: BORDE,
      borderColor: colors.borderStrong,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    // bg-zinc-900/75 encima del blur
    capa: {
      backgroundColor: colors.navbar,
    },
    // Cápsula blanca de la pestaña activa: bg-white rounded-full shadow-md
    indicador: {
      position: 'absolute',
      left: 0,
      top: 0,
      borderRadius: 9999,
      backgroundColor: colors.primary,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 6,
      shadowOpacity: 0.1,
      elevation: 3,
    },
    // px-4 py-2 gap-2: alto fijo de 34 (8 + ícono 18 + 8) con ícono y etiqueta centrados.
    activa: {
      height: ALTO_CAPSULA,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      borderRadius: 9999,
    },
    // font-label-caps text-[11px] tracking-tight font-semibold. Sin lineHeight a propósito:
    // en iOS el espacio extra no se reparte parejo y la etiqueta se descentra del ícono.
    etiqueta: {
      fontFamily: fonts.monoSemiBold,
      fontSize: 11,
      letterSpacing: -0.275,
      color: colors.onPrimary,
      includeFontPadding: false,
    },
    // text-neutral-400 p-2.5
    inactiva: {
      padding: 10,
      borderRadius: 9999,
    },
    icono: {
      fontFamily: FUENTE_ICONOS,
      includeFontPadding: false,
    },
    // w-11 h-11 bg-white rounded-full shadow-lg
    central: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 15,
      shadowOpacity: 0.1,
      elevation: 6,
    },
  });
