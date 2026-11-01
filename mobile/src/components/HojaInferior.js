import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';

const DURACION_ENTRADA = 280;
const DURACION_SALIDA = 200;

// Hoja inferior de pantalla completa (Nuevo gasto, Perfil). La ruta usa
// presentation: 'transparentModal' y animation: 'none'; la animación la hace este componente:
// el fondo con blur aparece y la hoja sube desde abajo. El alto lo da el contenido, con tope de 92%.
// - `onCerrada`: se llama al terminar la animación de salida (normalmente navigation.goBack).
// - `bloqueada`: ignora la X y el toque en el fondo (por ejemplo mientras se guarda).
// - `ref.current.cerrar()`: cierra con animación aunque esté bloqueada.
export default function HojaInferior({
  ref,
  titulo,
  etiquetaFondo,
  onCerrada,
  bloqueada = false,
  children,
}) {
  const insets = useSafeAreaInsets();
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const { height } = useWindowDimensions();
  const cerrando = useRef(false);

  // 0 = hoja oculta abajo, 1 = hoja visible.
  const [progreso] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progreso, {
      toValue: 1,
      duration: DURACION_ENTRADA,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progreso]);

  const cerrar = useCallback(() => {
    if (cerrando.current) return;
    cerrando.current = true;
    Animated.timing(progreso, {
      toValue: 0,
      duration: DURACION_SALIDA,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onCerrada?.());
  }, [onCerrada, progreso]);

  useImperativeHandle(ref, () => ({ cerrar }), [cerrar]);

  const cerrarPorUsuario = () => {
    if (!bloqueada) cerrar();
  };

  const translateY = progreso.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <View style={styles.pantalla}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progreso }]}>
        <BlurView
          intensity={20}
          tint={esOscuro ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          style={[StyleSheet.absoluteFill, styles.velo]}
          onPress={cerrarPorUsuario}
          accessibilityRole="button"
          accessibilityLabel={etiquetaFondo || `Cerrar ${titulo}`}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.hoja,
          {
            maxHeight: height * 0.92,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Tinte de color arriba que se funde con la hoja (08_nuevo_gasto_referencia) */}
        <LinearGradient
          colors={[colors.tinteHoja, colors.tinteHojaFin]}
          style={styles.tinte}
          pointerEvents="none"
        />
        <View style={styles.jalador} />

        <View style={styles.cabecera}>
          <Text style={styles.titulo}>{titulo}</Text>
          <Pressable
            onPress={cerrarPorUsuario}
            hitSlop={10}
            style={styles.botonCerrar}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <MaterialCommunityIcons name="close" size={18} color={colors.textChip} />
          </Pressable>
        </View>

        {children}
      </Animated.View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    // bg-black/40 + backdrop-blur-sm
    velo: {
      backgroundColor: colors.scrimSoft,
    },
    // rounded-t-[32px] bg-sheetDeep px-5 pt-2 pb-5. El borde superior hace de brillo,
    // en todo el ancho y siguiendo el radio.
    // shadow-[0_-20px_50px] negro al 90%
    hoja: {
      backgroundColor: colors.sheetDeep,
      borderTopLeftRadius: radios.hoja,
      borderTopRightRadius: radios.hoja,
      borderTopWidth: 1,
      borderTopColor: colors.borderTop,
      paddingHorizontal: 20,
      paddingTop: 8,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: -20 },
      shadowRadius: 25,
      shadowOpacity: 0.9,
    },
    // Dentro del borde superior, con el mismo radio; overflow solo en esta capa para no
    // recortar la sombra de la hoja.
    tinte: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 180,
      borderTopLeftRadius: radios.hoja - 1,
      borderTopRightRadius: radios.hoja - 1,
      overflow: 'hidden',
    },
    // w-12 h-1 bg-white/30 rounded-full mt-1.5 mb-3
    jalador: {
      alignSelf: 'center',
      width: 48,
      height: 4,
      borderRadius: radios.full,
      backgroundColor: colors.handleSheet,
      marginTop: 6,
      marginBottom: 12,
    },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    // headline-md (Obsidian): Inter 22/28 semibold, -0.015em
    titulo: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.33,
      color: colors.text,
    },
    // w-9 h-9 rounded-full bg-white/[0.07] border border-white/10, ícono 18 zinc-300
    botonCerrar: {
      width: 36,
      height: 36,
      borderRadius: radios.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.glass07,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
  });
