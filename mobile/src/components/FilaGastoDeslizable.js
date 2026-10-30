import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Extrapolation,
  FadeOut,
  interpolate,
  LinearTransition,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useGastosService } from '../services/gastos';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import ItemGasto from './ItemGasto';

const TAMANO_ACCION = 56;
const SEPARACION = 8;
// Progreso (0 cerrada, 1 abierta) a partir del cual la fila se queda abierta al soltar: es el
// rightThreshold por defecto de ReanimatedSwipeable (la mitad del ancho de las acciones).
const UMBRAL = 0.5;
// Resorte de apertura y cierre: un rebote corto al abrir y un cierre suave.
const RESORTE = { mass: 1, damping: 20, stiffness: 220, overshootClamping: false };
// Golpe del ícono al quedar abierta.
const GOLPE = { duration: 140 };

const vibrar = (estilo) => Haptics.impactAsync(estilo).catch(() => {});
const vibrarUmbral = () => vibrar(Haptics.ImpactFeedbackStyle.Medium);

// Coordina las filas de una lista: solo una abierta a la vez y se cierra al hacer scroll.
//   const filas = useFilasDeslizables();
//   <FlatList onScrollBeginDrag={filas.cerrarAbierta} ... />
export function useFilasDeslizables() {
  const abierta = useRef(null);
  return useMemo(
    () => ({
      abrir: (fila) => {
        if (abierta.current && abierta.current !== fila) abierta.current.close();
        abierta.current = fila;
      },
      cerrada: (fila) => {
        if (abierta.current === fila) abierta.current = null;
      },
      cerrarAbierta: () => {
        abierta.current?.close();
        abierta.current = null;
      },
    }),
    [],
  );
}

// Acciones que aparecen a la derecha al deslizar: Editar (vidrio con tinte del acento) y Eliminar
// (rojo sólido). Entran con escala y fundido según el arrastre, Eliminar un poco después; al
// quedar abierta, los íconos dan un golpe corto. Todo corre en el hilo de UI con `progreso`.
// Con "Reducir movimiento" solo hay fundido.
function AccionesGasto({ progreso, onEditar, onEliminar, deshabilitadas }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const reducirMovimiento = useReducedMotion();
  const golpe = useSharedValue(0);

  // Haptic al cruzar el umbral mientras se arrastra; se rearma al volver por debajo.
  useAnimatedReaction(
    () => progreso.value >= UMBRAL,
    (pasa, antes) => {
      if (pasa && antes === false) scheduleOnRN(vibrarUmbral);
    },
  );

  // Golpe de los íconos al llegar a abierta (una vez por apertura).
  useAnimatedReaction(
    () => progreso.value >= 0.98,
    (abierta, antes) => {
      if (abierta && antes === false && !reducirMovimiento) {
        golpe.set(withSequence(withTiming(1, GOLPE), withTiming(0, GOLPE)));
      }
    },
  );

  const entrada = (desde, hasta) => {
    'worklet';
    const t = interpolate(progreso.value, [desde, hasta], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: t,
      transform: [{ scale: reducirMovimiento ? 1 : 0.6 + 0.4 * t }],
    };
  };
  const estiloEditar = useAnimatedStyle(() => entrada(0.1, 0.7));
  const estiloEliminar = useAnimatedStyle(() => entrada(0.3, 0.9));
  const estiloIcono = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-12 * golpe.value}deg` }, { scale: 1 + 0.12 * golpe.value }],
  }));

  const tocar = (accion) => () => {
    vibrar(Haptics.ImpactFeedbackStyle.Light);
    accion();
  };

  return (
    <View style={styles.acciones}>
      <Animated.View style={estiloEditar}>
        <Pressable
          onPress={tocar(onEditar)}
          disabled={deshabilitadas}
          accessibilityRole="button"
          accessibilityLabel="Editar"
          style={({ pressed }) => [
            styles.accion,
            styles.editar,
            pressed ? styles.presionada : null,
          ]}
        >
          <Animated.View style={estiloIcono}>
            <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.acento} />
          </Animated.View>
          <Text style={[styles.etiqueta, styles.etiquetaEditar]}>Editar</Text>
        </Pressable>
      </Animated.View>
      <Animated.View style={estiloEliminar}>
        <Pressable
          onPress={tocar(onEliminar)}
          disabled={deshabilitadas}
          accessibilityRole="button"
          accessibilityLabel="Eliminar"
          style={({ pressed }) => [
            styles.accion,
            styles.eliminar,
            pressed ? styles.presionada : null,
          ]}
        >
          <Animated.View style={estiloIcono}>
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color={colors.textoSobreColor}
            />
          </Animated.View>
          <Text style={[styles.etiqueta, styles.etiquetaEliminar]}>Eliminar</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// Fila de gasto que se desliza a la izquierda para mostrar Editar y Eliminar (no hay "deslizar
// hasta el fondo para eliminar"). Tocar la fila no hace nada. `filas` viene de
// useFilasDeslizables de la lista; `onEditar(gasto)` abre la edición y `onEliminado(id)` avisa a
// la lista para quitar la fila y recargar. Al eliminarse, la fila se desvanece y las de abajo
// suben con una transición de layout.
export default function FilaGastoDeslizable({
  gasto,
  nombreCategoria,
  metodoPago,
  filas,
  onEditar,
  onEliminado,
}) {
  const { eliminarGasto } = useGastosService();
  const styles = useEstilos(crearEstilos);
  const swipeRef = useRef(null);
  const enviando = useRef(false);
  const [eliminando, setEliminando] = useState(false);

  const cerrar = () => swipeRef.current?.close();

  const editar = () => {
    cerrar();
    onEditar(gasto);
  };

  const eliminar = async () => {
    if (enviando.current) return;
    enviando.current = true;
    setEliminando(true);
    try {
      await eliminarGasto(gasto.id);
      onEliminado(gasto.id);
    } catch (error) {
      enviando.current = false;
      setEliminando(false);
      cerrar();
      if (error?.code === 'GASTO_NO_ENCONTRADO') {
        Alert.alert('Este gasto ya no existe', 'Actualizamos la lista.');
        onEliminado(gasto.id);
      } else {
        Alert.alert('No se pudo eliminar', mensajeError(error?.code, error?.message));
      }
    }
  };

  // Cancelar (o descartar la alerta) solo cierra la fila.
  const confirmarEliminar = () => {
    if (enviando.current) return;
    Alert.alert(
      '¿Eliminar gasto?',
      'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel', onPress: cerrar },
        { text: 'Eliminar', style: 'destructive', onPress: eliminar },
      ],
      { cancelable: true, onDismiss: cerrar },
    );
  };

  const accionAccesible = ({ nativeEvent }) => {
    if (nativeEvent.actionName === 'editar') editar();
    if (nativeEvent.actionName === 'eliminar') confirmarEliminar();
  };

  return (
    <Animated.View exiting={FadeOut.duration(200)} layout={LinearTransition}>
      <ReanimatedSwipeable
        ref={swipeRef}
        friction={2}
        overshootFriction={8}
        // El gesto se activa con 20 px horizontales; un arrastre vertical lo toma el scroll.
        dragOffsetFromRightEdge={20}
        enabled={!eliminando}
        animationOptions={RESORTE}
        renderRightActions={(progreso) => (
          <AccionesGasto
            progreso={progreso}
            onEditar={editar}
            onEliminar={confirmarEliminar}
            deshabilitadas={eliminando}
          />
        )}
        onSwipeableOpenStartDrag={() => filas.abrir(swipeRef.current)}
        onSwipeableWillOpen={() => filas.abrir(swipeRef.current)}
        onSwipeableClose={() => filas.cerrada(swipeRef.current)}
      >
        <View
          accessible
          accessibilityHint="Desliza a la izquierda para editar o eliminar"
          accessibilityActions={[
            { name: 'editar', label: 'Editar' },
            { name: 'eliminar', label: 'Eliminar' },
          ]}
          onAccessibilityAction={accionAccesible}
          style={eliminando ? styles.eliminando : null}
        >
          <ItemGasto gasto={gasto} nombreCategoria={nombreCategoria} metodoPago={metodoPago} />
        </View>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // Separación y margen como entre filas (gap-2)
    acciones: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SEPARACION,
      paddingLeft: SEPARACION,
    },
    // Squircle rounded-2xl de 56
    accion: {
      width: TAMANO_ACCION,
      height: TAMANO_ACCION,
      borderRadius: radios['2xl'],
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    editar: {
      backgroundColor: colors.acentoSuave,
      borderWidth: 1,
      borderColor: colors.acentoSuave,
    },
    eliminar: {
      backgroundColor: colors.alertaSolido,
    },
    presionada: {
      opacity: 0.8,
    },
    etiqueta: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 10,
      lineHeight: 13,
    },
    etiquetaEditar: {
      color: colors.acentoTexto,
    },
    etiquetaEliminar: {
      color: colors.textoSobreColor,
    },
    eliminando: {
      opacity: 0.5,
    },
  });
