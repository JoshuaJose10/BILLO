import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import Boton from './Boton';

// Mismo alto que TecladoNumerico (4 filas de 44 + 3 huecos de 6): la hoja no cambia de tamaño al
// pasar del teclado a la escucha.
const ALTO = 194;
const ORBE = 64;
const PULSO = { duration: 1600, easing: Easing.out(Easing.quad) };

// Anillo que crece y se desvanece en bucle. Con "Reducir movimiento" queda quieto.
function Anillo({ retraso, reducirMovimiento }) {
  const styles = useEstilos(crearEstilos);
  const avance = useSharedValue(0);

  useEffect(() => {
    if (reducirMovimiento) return;
    avance.set(withDelay(retraso, withRepeat(withTiming(1, PULSO), -1, false)));
  }, [avance, retraso, reducirMovimiento]);

  const estilo = useAnimatedStyle(() =>
    reducirMovimiento
      ? { opacity: 0.35, transform: [{ scale: 1.3 }] }
      : { opacity: 0.5 * (1 - avance.value), transform: [{ scale: 1 + avance.value * 0.9 }] },
  );

  return <Animated.View pointerEvents="none" style={[styles.anillo, estilo]} />;
}

// Vista de Nuevo gasto mientras se dicta (Stitch nuevo_gasto_modo_voz): estado, micrófono con
// halo y anillos de pulso coral, transcripción en vivo y Detener. Ocupa el lugar del teclado.
// - `estado`: 'preparando' (pidiendo permiso) | 'escuchando'.
// - `onDetener()`: termina de escuchar; el texto se interpreta al llegar el resultado final.
export default function EscuchaVoz({ estado, transcripcion, onDetener }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const reducirMovimiento = useReducedMotion();
  const escuchando = estado === 'escuchando';

  return (
    <View style={styles.contenedor}>
      <View style={styles.estado}>
        <View style={[styles.puntoEstado, escuchando ? styles.puntoActivo : null]} />
        <Text style={styles.estadoTexto}>{escuchando ? 'Escuchando…' : 'Preparando…'}</Text>
      </View>

      <View style={styles.zonaOrbe}>
        {escuchando ? (
          <>
            <Anillo retraso={0} reducirMovimiento={reducirMovimiento} />
            <Anillo retraso={PULSO.duration / 2} reducirMovimiento={reducirMovimiento} />
          </>
        ) : null}
        <View style={styles.halo} />
        <Pressable
          onPress={onDetener}
          disabled={!escuchando}
          accessibilityRole="button"
          accessibilityLabel="Detener dictado"
          style={({ pressed }) => [styles.orbe, pressed ? styles.orbePresionado : null]}
        >
          <MaterialCommunityIcons name="microphone" size={30} color={colors.onPrimary} />
        </Pressable>
      </View>

      <View style={styles.burbuja}>
        <MaterialCommunityIcons name="format-quote-open" size={18} color={colors.textSecondary} />
        <Text
          style={[styles.transcripcion, transcripcion ? null : styles.sugerencia]}
          numberOfLines={2}
          accessibilityLiveRegion="polite"
        >
          {transcripcion ? `«${transcripcion}»` : 'Di algo como «ochenta pesos en comida»'}
        </Text>
      </View>

      <Boton titulo="Detener" icono="stop" onPress={onDetener} disabled={!escuchando} secundario />
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    contenedor: {
      minHeight: ALTO,
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    // px-3 py-1 rounded-full bg-white/5 border-white/10
    estado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: radios.full,
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.border,
    },
    puntoEstado: {
      width: 8,
      height: 8,
      borderRadius: radios.full,
      backgroundColor: colors.outline,
    },
    puntoActivo: {
      backgroundColor: colors.vozPulso,
    },
    estadoTexto: {
      fontFamily: fonts.sansMedium,
      fontSize: 11,
      letterSpacing: 0.3,
      color: colors.textVariant,
    },
    zonaOrbe: {
      width: ORBE * 1.5,
      height: ORBE + 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    anillo: {
      position: 'absolute',
      width: ORBE,
      height: ORBE,
      borderRadius: radios.full,
      borderWidth: 2,
      borderColor: colors.vozPulso,
      backgroundColor: colors.vozHalo,
    },
    halo: {
      position: 'absolute',
      width: ORBE + 16,
      height: ORBE + 16,
      borderRadius: radios.full,
      backgroundColor: colors.vozHalo,
    },
    orbe: {
      width: ORBE,
      height: ORBE,
      borderRadius: radios.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      shadowColor: colors.vozPulso,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 18,
      shadowOpacity: 0.5,
      elevation: 6,
    },
    orbePresionado: {
      transform: [{ scale: 0.95 }],
    },
    // Burbuja de transcripción: rounded-2xl bg-white/[0.06] border-white/15
    burbuja: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radios['2xl'],
      backgroundColor: colors.glass07,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    transcripcion: {
      flex: 1,
      fontFamily: fonts.sansMedium,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    sugerencia: {
      color: colors.textSecondary,
    },
  });
