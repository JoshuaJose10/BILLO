import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { radios } from '../theme/colors';
import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';

const PADDING = 4;
// Deslizamiento del indicador: resorte suave; con "Reducir movimiento", un fundido corto en lugar
// del resorte (withTiming de 120 ms sin rebote).
const RESORTE = { damping: 22, stiffness: 260, mass: 0.8 };
const CORTO = { duration: 120, easing: Easing.out(Easing.quad) };

// Control segmentado tipo píldora (Stitch 08_nuevo_gasto_referencia, "Gasto | Ingreso"): pista de
// vidrio neutro y un indicador sólido (`primary`: blanco en oscuro, negro en claro, como los
// activos de la app) que se desliza bajo la opción activa. Segmentos del mismo ancho.
// - `opciones`: [{ valor, etiqueta, insignia? }]; `insignia` es un mini badge (p. ej. "Pronto").
// - `valor`, `onCambiar(valor)`; `accessibilityLabel` del grupo; `style` del contenedor.
// Las insignias sobresalen 10 px por arriba: deja ese espacio libre encima.
export default function SelectorSegmentado({
  opciones,
  valor,
  onCambiar,
  accessibilityLabel,
  style,
}) {
  const styles = useEstilos(crearEstilos);
  const reducirMovimiento = useReducedMotion();
  const [anchoSegmento, setAnchoSegmento] = useState(0);
  const indice = Math.max(
    opciones.findIndex((o) => o.valor === valor),
    0,
  );
  const posicion = useSharedValue(indice);

  useEffect(() => {
    posicion.set(reducirMovimiento ? withTiming(indice, CORTO) : withSpring(indice, RESORTE));
  }, [indice, posicion, reducirMovimiento]);

  const estiloIndicador = useAnimatedStyle(() => ({
    width: anchoSegmento,
    transform: [{ translateX: posicion.value * anchoSegmento }],
  }));

  const elegir = (opcion) => {
    if (opcion.valor === valor) return;
    Haptics.selectionAsync().catch(() => {});
    onCambiar(opcion.valor);
  };

  return (
    <View
      style={[styles.pista, style]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) =>
        setAnchoSegmento((e.nativeEvent.layout.width - PADDING * 2 - 2) / opciones.length)
      }
    >
      {anchoSegmento > 0 ? (
        <Animated.View pointerEvents="none" style={[styles.indicador, estiloIndicador]} />
      ) : null}
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        return (
          <Pressable
            key={opcion.valor}
            onPress={() => elegir(opcion)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={
              opcion.insignia ? `${opcion.etiqueta}, ${opcion.insignia}` : opcion.etiqueta
            }
            style={styles.segmento}
          >
            <Text
              style={[styles.etiqueta, activa ? styles.etiquetaActiva : null]}
              numberOfLines={1}
            >
              {opcion.etiqueta}
            </Text>
            {opcion.insignia ? (
              <View style={styles.insignia}>
                <View style={[styles.insigniaTinte, activa ? styles.insigniaActiva : null]}>
                  <Text style={[styles.insigniaTexto, activa ? styles.insigniaTextoActiva : null]}>
                    {opcion.insignia}
                  </Text>
                </View>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // rounded-full p-1 con vidrio neutro y borde sutil
    pista: {
      flexDirection: 'row',
      padding: PADDING,
      borderRadius: radios.full,
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    // Cápsula sólida bajo la opción activa
    indicador: {
      position: 'absolute',
      top: PADDING,
      bottom: PADDING,
      left: PADDING,
      borderRadius: radios.full,
      backgroundColor: colors.primary,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      shadowOpacity: 0.15,
    },
    segmento: {
      flex: 1,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    etiqueta: {
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      color: colors.textSecondary,
    },
    etiquetaActiva: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onPrimary,
    },
    // Mini badge en la esquina superior derecha del segmento, por encima del borde de la pista
    // para no quitarle ancho a la etiqueta. Base sólida (queda sobre el brillo del fondo) con el
    // tinte acentoSuave encima, para que acentoTexto conserve su contraste.
    insignia: {
      position: 'absolute',
      top: -10,
      right: 2,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceLowest,
    },
    insigniaTinte: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: radios.full,
      backgroundColor: colors.acentoSuave,
      borderWidth: 1,
      borderColor: colors.acentoSuave,
    },
    // Sobre el indicador sólido el acento no da contraste: la insignia toma el color del indicador
    // con borde en onPrimary.
    insigniaActiva: {
      backgroundColor: colors.primary,
      borderColor: colors.onPrimary,
    },
    insigniaTexto: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 9,
      lineHeight: 12,
      color: colors.acentoTexto,
    },
    insigniaTextoActiva: {
      color: colors.onPrimary,
    },
  });
