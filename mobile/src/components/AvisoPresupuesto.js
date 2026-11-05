import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';

// Tiempo visible antes de irse solo.
const DURACION_VISIBLE = 5000;
const MARGEN = 16;
const MARGEN_SUPERIOR = 8;
// Entra con un rebote corto; sale hacia arriba acelerando. Con "Reducir movimiento", fundido.
const RESORTE_ENTRADA = { damping: 18, stiffness: 220, mass: 0.9 };
const RESORTE_REGRESO = { damping: 22, stiffness: 300 };
const SALIDA = { duration: 220, easing: Easing.in(Easing.cubic) };
const FUNDIDO = { duration: 200, easing: Easing.out(Easing.quad) };
// Descartar deslizando hacia arriba: distancia o velocidad mínimas.
const UMBRAL_DESCARTE = 32;
const VELOCIDAD_DESCARTE = 500;
// Hacia abajo solo cede un poco (resistencia).
const RESISTENCIA_ABAJO = 0.15;
// Alto aproximado hasta que onLayout da el real (se usa para esconderlo arriba).
const ALTO_INICIAL = 80;

// Aviso de presupuesto (HU-35) arriba de toda la app, debajo del safe area (Dynamic Island).
// `aviso` = { id, estado: 'alerta' | 'excedido', titulo, mensaje, texto, mes? }. Lo dibuja
// AvisosProvider; un aviso nuevo llega con otro `key`, así que reemplaza a este y vuelve a entrar.
// - Se va solo a los 5 s, o al deslizarlo hacia arriba (el temporizador se pausa mientras se arrastra).
// - Tocarlo llama a `onTocar(aviso)` y se cierra.
// - `onCerrado(id)` se llama cuando termina de salir.
// Vidrio como la navbar: blur + avisoVidrio + el tinte Suave del estado, con borde e ícono del color
// de estado (las variantes *Texto pasan 3:1 sobre el vidrio en ambos temas).
export default function AvisoPresupuesto({ aviso, onTocar, onCerrado }) {
  const insets = useSafeAreaInsets();
  const reducirMovimiento = useReducedMotion();
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const excedido = aviso.estado === 'excedido';

  // 0 = escondido arriba, 1 = visible. `arrastre` es el desplazamiento del dedo. `cerrando` es un
  // shared value (lectura síncrona) para que salir() corra una sola vez aunque coincidan el
  // temporizador, el toque y el deslizamiento.
  const progreso = useSharedValue(0);
  const arrastre = useSharedValue(0);
  const alto = useSharedValue(ALTO_INICIAL);
  const cerrando = useSharedValue(false);
  // Mientras se arrastra, el temporizador de 5 s se detiene; al soltar sin descartar vuelve a correr.
  const [pausado, setPausado] = useState(false);
  const { id } = aviso;
  const distanciaOculto = insets.top + MARGEN_SUPERIOR;

  const salir = useCallback(() => {
    if (cerrando.get()) return;
    cerrando.set(true);
    progreso.set(
      withTiming(0, reducirMovimiento ? FUNDIDO : SALIDA, (terminado) => {
        if (terminado) scheduleOnRN(onCerrado, id);
      }),
    );
  }, [reducirMovimiento, cerrando, progreso, onCerrado, id]);

  const tocar = useCallback(() => {
    if (cerrando.get()) return;
    onTocar?.(aviso);
    salir();
  }, [cerrando, onTocar, aviso, salir]);

  useEffect(() => {
    progreso.set(reducirMovimiento ? withTiming(1, FUNDIDO) : withSpring(1, RESORTE_ENTRADA));
  }, [progreso, reducirMovimiento]);

  useEffect(() => {
    if (pausado) return undefined;
    const temporizador = setTimeout(salir, DURACION_VISIBLE);
    return () => clearTimeout(temporizador);
  }, [pausado, salir]);

  const gesto = useMemo(() => {
    const deslizar = Gesture.Pan()
      .activeOffsetY([-8, 8])
      .failOffsetX([-24, 24])
      .onStart(() => {
        scheduleOnRN(setPausado, true);
      })
      .onUpdate((e) => {
        arrastre.set(e.translationY < 0 ? e.translationY : e.translationY * RESISTENCIA_ABAJO);
      })
      .onEnd((e) => {
        if (e.translationY < -UMBRAL_DESCARTE || e.velocityY < -VELOCIDAD_DESCARTE) {
          scheduleOnRN(salir);
        } else {
          arrastre.set(withSpring(0, RESORTE_REGRESO));
          scheduleOnRN(setPausado, false);
        }
      });
    const tocarGesto = Gesture.Tap().onEnd((_e, exito) => {
      if (exito) scheduleOnRN(tocar);
    });
    return Gesture.Race(deslizar, tocarGesto);
  }, [arrastre, salir, tocar]);

  const estiloAnimado = useAnimatedStyle(() => {
    if (reducirMovimiento) {
      return { opacity: progreso.value, transform: [{ translateY: arrastre.value }] };
    }
    const oculto = -(distanciaOculto + alto.value + MARGEN);
    return { transform: [{ translateY: (1 - progreso.value) * oculto + arrastre.value }] };
  });

  // VoiceOver/TalkBack: doble toque abre los presupuestos; el gesto de escape o la acción
  // "Descartar" lo cierran.
  const alAccionAccesible = (evento) => {
    const accion = evento.nativeEvent.actionName;
    if (accion === 'activate') tocar();
    else if (accion === 'escape' || accion === 'descartar') salir();
  };

  return (
    <View pointerEvents="box-none" style={[styles.contenedor, { top: distanciaOculto }]}>
      <GestureDetector gesture={gesto}>
        <Animated.View
          onLayout={(e) => alto.set(e.nativeEvent.layout.height)}
          style={[styles.sombra, estiloAnimado]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={aviso.texto}
          accessibilityHint="Abre tus presupuestos"
          accessibilityActions={[
            { name: 'activate' },
            { name: 'escape' },
            { name: 'descartar', label: 'Descartar' },
          ]}
          onAccessibilityAction={alAccionAccesible}
        >
          <View style={[styles.tarjeta, excedido ? styles.bordeExcedido : styles.bordeAlerta]}>
            <BlurView
              tint={esOscuro ? 'dark' : 'light'}
              intensity={60}
              style={StyleSheet.absoluteFill}
            />
            <View style={[StyleSheet.absoluteFill, styles.vidrio]} />
            <View
              style={[
                StyleSheet.absoluteFill,
                excedido ? styles.tinteExcedido : styles.tinteAlerta,
              ]}
            />
            <View style={[styles.icono, excedido ? styles.tinteExcedido : styles.tinteAlerta]}>
              <MaterialCommunityIcons
                name={excedido ? 'alert-octagon' : 'alert'}
                size={18}
                color={excedido ? colors.alertaTexto : colors.avisoTexto}
              />
            </View>
            <View style={styles.textos}>
              <Text style={styles.titulo} numberOfLines={2}>
                {aviso.titulo}
              </Text>
              <Text style={styles.mensaje} numberOfLines={2}>
                {aviso.mensaje}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textVariant} />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    contenedor: {
      position: 'absolute',
      left: MARGEN,
      right: MARGEN,
      alignItems: 'center',
      zIndex: 1000,
      elevation: 1000,
    },
    // La sombra va por fuera porque la tarjeta usa overflow: hidden (blur).
    sombra: {
      width: '100%',
      maxWidth: 500,
      borderRadius: radios.tarjeta,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 24,
      shadowOpacity: 0.25,
      elevation: 12,
    },
    tarjeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingLeft: 12,
      paddingRight: 10,
      borderRadius: radios.tarjeta,
      borderWidth: 1,
      overflow: 'hidden',
    },
    bordeAlerta: {
      borderColor: colors.avisoTexto,
    },
    bordeExcedido: {
      borderColor: colors.alertaTexto,
    },
    vidrio: {
      backgroundColor: colors.avisoVidrio,
    },
    tinteAlerta: {
      backgroundColor: colors.avisoSuave,
    },
    tinteExcedido: {
      backgroundColor: colors.alertaSuave,
    },
    icono: {
      width: 36,
      height: 36,
      borderRadius: radios.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textos: {
      flex: 1,
      gap: 2,
    },
    titulo: {
      fontFamily: fonts.sansBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    mensaje: {
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textVariant,
    },
  });
