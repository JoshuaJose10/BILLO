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
  useAnimatedStyle,
  useReducedMotion,
} from 'react-native-reanimated';

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
// Estiramiento máximo de los botones al pasarse de abierta.
const ESCALA_MAXIMA = 1.06;
// Resorte de apertura y cierre: casi crítico (un rebote apenas perceptible) para que al cerrar la
// fila no se pase hacia la derecha.
const RESORTE = { mass: 1, damping: 26, stiffness: 220, overshootClamping: false };

const vibrar = (estilo) => Haptics.impactAsync(estilo).catch(() => {});

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

// Un botón de acción animado con `progreso` (0 cerrada, 1 abierta, > 1 al pasarse): aparece con
// fundido (en reposo siempre invisible), crece de 0.8 a 1 y llega desde `desplazamiento` px a la
// derecha (parallax). Al pasarse se estira apenas, hasta 1.06. Con "Reducir movimiento" solo
// hay fundido. Corre en el hilo de UI.
function BotonAccion({ progreso, desplazamiento, reducirMovimiento, style, children, ...props }) {
  const estilo = useAnimatedStyle(() => {
    const p = progreso.value;
    const opacity = interpolate(p, [0, 0.35], [0, 1], Extrapolation.CLAMP);
    if (reducirMovimiento) return { opacity };
    const scale =
      p > 1
        ? Math.min(1 + (p - 1) * 0.3, ESCALA_MAXIMA)
        : interpolate(p, [0, 1], [0.8, 1], Extrapolation.CLAMP);
    const translateX = interpolate(p, [0, 1], [desplazamiento, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateX }, { scale }] };
  });

  return (
    <Animated.View style={estilo}>
      <Pressable accessibilityRole="button" style={style} {...props}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

// Acciones detrás de la fila, a la derecha: Editar (vidrio con tinte del acento) y Eliminar (rojo
// sólido). Ya están renderizadas; la fila (opaca) las destapa al deslizar. Eliminar, el de más
// afuera, llega desde más lejos que Editar.
function AccionesGasto({ progreso, onEditar, onEliminar, deshabilitadas }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const reducirMovimiento = useReducedMotion();

  const tocar = (accion) => () => {
    vibrar(Haptics.ImpactFeedbackStyle.Light);
    accion();
  };

  return (
    <View style={styles.acciones}>
      <BotonAccion
        progreso={progreso}
        desplazamiento={12}
        reducirMovimiento={reducirMovimiento}
        onPress={tocar(onEditar)}
        disabled={deshabilitadas}
        accessibilityLabel="Editar"
        style={({ pressed }) => [styles.accion, styles.editar, pressed ? styles.presionada : null]}
      >
        <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.acento} />
        <Text style={[styles.etiqueta, styles.etiquetaEditar]}>Editar</Text>
      </BotonAccion>
      <BotonAccion
        progreso={progreso}
        desplazamiento={24}
        reducirMovimiento={reducirMovimiento}
        onPress={tocar(onEliminar)}
        disabled={deshabilitadas}
        accessibilityLabel="Eliminar"
        style={({ pressed }) => [
          styles.accion,
          styles.eliminar,
          pressed ? styles.presionada : null,
        ]}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.textoSobreColor} />
        <Text style={[styles.etiqueta, styles.etiquetaEliminar]}>Eliminar</Text>
      </BotonAccion>
    </View>
  );
}

// Fila de gasto que se desliza a la izquierda para mostrar Editar y Eliminar (no hay "deslizar
// hasta el fondo para eliminar"). Tocar la fila (cerrada) abre la edición; si está abierta, solo
// la cierra. Al empezar a deslizarla para abrir vibra una vez ("desenganche"). `filas` viene de
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
  // `abierta`: la fila está (o va hacia) abierta. `arrastrando`: hay un gesto o su animación de
  // asentamiento en curso; mientras tanto el toque se ignora, para que soltar un deslizamiento no
  // cuente como tap.
  const abierta = useRef(false);
  const arrastrando = useRef(false);
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

  const tocarFila = () => {
    if (arrastrando.current) return;
    if (abierta.current) {
      cerrar();
      return;
    }
    vibrar(Haptics.ImpactFeedbackStyle.Light);
    onEditar(gasto);
  };

  // Una sola vibración por gesto: el callback corre una vez al empezar a arrastrar. Solo al
  // abrir hacia la izquierda; arrastrar para cerrar no vibra.
  const empezarAbrir = (direccion) => {
    arrastrando.current = true;
    filas.abrir(swipeRef.current);
    if (direccion === 'left') vibrar(Haptics.ImpactFeedbackStyle.Rigid);
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
        containerStyle={styles.contenedor}
        animationOptions={RESORTE}
        renderRightActions={(progreso) => (
          <AccionesGasto
            progreso={progreso}
            onEditar={editar}
            onEliminar={confirmarEliminar}
            deshabilitadas={eliminando}
          />
        )}
        onSwipeableOpenStartDrag={empezarAbrir}
        onSwipeableCloseStartDrag={() => {
          arrastrando.current = true;
        }}
        onSwipeableWillOpen={() => {
          abierta.current = true;
          filas.abrir(swipeRef.current);
        }}
        onSwipeableWillClose={() => {
          abierta.current = false;
        }}
        onSwipeableOpen={() => {
          arrastrando.current = false;
        }}
        onSwipeableClose={() => {
          abierta.current = false;
          arrastrando.current = false;
          filas.cerrada(swipeRef.current);
        }}
      >
        <Pressable
          onPress={tocarFila}
          disabled={eliminando}
          accessibilityRole="button"
          accessibilityHint="Toca para editar. Desliza a la izquierda para más opciones."
          accessibilityActions={[
            { name: 'editar', label: 'Editar' },
            { name: 'eliminar', label: 'Eliminar' },
          ]}
          onAccessibilityAction={accionAccesible}
          style={({ pressed }) => [
            pressed ? styles.filaPresionada : null,
            eliminando ? styles.eliminando : null,
          ]}
        >
          <ItemGasto
            gasto={gasto}
            nombreCategoria={nombreCategoria}
            metodoPago={metodoPago}
            opaca
          />
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // Nada se sale del card: ni la fila al deslizarse ni las acciones.
    contenedor: {
      borderRadius: radios['2xl'],
      overflow: 'hidden',
    },
    // Ancho fijo (ReanimatedSwipeable lo mide para saber cuánto abrir), alto de la fila y botones
    // centrados; separación y margen como entre filas (gap-2).
    acciones: {
      width: ANCHO_ACCIONES,
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
    // Feedback al presionar la fila
    filaPresionada: {
      transform: [{ scale: 0.98 }],
    },
    eliminando: {
      opacity: 0.5,
    },
  });
