import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  FadeOut,
  LinearTransition,
  useAnimatedReaction,
  useAnimatedStyle,
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
// Ancho total de las acciones: margen izquierdo + dos botones + separación.
const ANCHO_ACCIONES = SEPARACION + TAMANO_ACCION + SEPARACION + TAMANO_ACCION;
// Progreso (0 cerrada, 1 abierta) a partir del cual la fila se queda abierta al soltar: es el
// rightThreshold por defecto de ReanimatedSwipeable (la mitad del ancho de las acciones).
const UMBRAL = 0.5;
// Resorte de apertura y cierre: casi crítico (un rebote apenas perceptible) para que al cerrar la
// fila no se pase hacia la derecha.
const RESORTE = { mass: 1, damping: 26, stiffness: 220, overshootClamping: false };

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

// Acciones fijas a la derecha, detrás de la fila: Editar (vidrio con tinte del acento) y Eliminar
// (rojo sólido). No se animan; la fila se desliza y las va destapando. Como la fila es
// translúcida, las acciones van en una ventana recortada que solo cubre la franja ya destapada
// (`traslado`), así nunca se ven a través de la fila. Ventana y contenido se mueven con
// transform en sentidos opuestos: los botones quedan quietos y todo corre en el hilo de UI.
function AccionesGasto({ progreso, traslado, onEditar, onEliminar, deshabilitadas }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  // Haptic al cruzar el umbral mientras se arrastra; se rearma al volver por debajo.
  useAnimatedReaction(
    () => progreso.value >= UMBRAL,
    (pasa, antes) => {
      if (pasa && antes === false) scheduleOnRN(vibrarUmbral);
    },
  );

  const oculto = () => {
    'worklet';
    return ANCHO_ACCIONES - Math.min(Math.max(-traslado.value, 0), ANCHO_ACCIONES);
  };
  const estiloVentana = useAnimatedStyle(() => ({ transform: [{ translateX: oculto() }] }));
  const estiloContenido = useAnimatedStyle(() => ({ transform: [{ translateX: -oculto() }] }));

  const tocar = (accion) => () => {
    vibrar(Haptics.ImpactFeedbackStyle.Light);
    accion();
  };

  return (
    <View style={styles.acciones}>
      <Animated.View style={[styles.ventana, estiloVentana]}>
        <Animated.View style={[styles.botones, estiloContenido]}>
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
            <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.acento} />
            <Text style={[styles.etiqueta, styles.etiquetaEditar]}>Editar</Text>
          </Pressable>
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
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={20}
              color={colors.textoSobreColor}
            />
            <Text style={[styles.etiqueta, styles.etiquetaEliminar]}>Eliminar</Text>
          </Pressable>
        </Animated.View>
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
        // Recorta la fila con el mismo radio al deslizarla.
        containerStyle={styles.contenedor}
        animationOptions={RESORTE}
        renderRightActions={(progreso, traslado) => (
          <AccionesGasto
            progreso={progreso}
            traslado={traslado}
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
    contenedor: {
      borderRadius: radios['2xl'],
    },
    // Ancho fijo para que ReanimatedSwipeable mida cuánto abrir; alto de la fila.
    acciones: {
      width: ANCHO_ACCIONES,
    },
    // Ventana que solo muestra la franja destapada por la fila.
    ventana: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    // Separación y margen como entre filas (gap-2)
    botones: {
      ...StyleSheet.absoluteFillObject,
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
