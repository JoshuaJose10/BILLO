import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useSacudida } from '../hooks/useSacudida';
import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { intentar } from '../utils/estadoCarga';
import { LOCALE } from '../utils/formato';
import Boton from './Boton';
import ChipSelector from './ChipSelector';

const vibrar = (ok) => {
  if (ok === true) return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  if (ok === false) return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

// Corre `tarea` (Reintentar o jalar para recargar) con feedback: vibración ligera al empezar y de
// éxito o error al terminar. { enCurso, ejecutar, fallo }: `fallo` es la hora del último intento que
// volvió a fallar. Un segundo toque mientras corre se ignora.
export function useIntento(tarea) {
  const [enCurso, setEnCurso] = useState(false);
  const [fallo, setFallo] = useState(null);
  const ocupado = useRef(false);
  const ejecutar = () => {
    if (ocupado.current) return;
    ocupado.current = true;
    return intentar(tarea, {
      alEmpezar: () => {
        vibrar().catch(() => {});
        setEnCurso(true);
      },
      alTerminar: (ok) => {
        ocupado.current = false;
        setEnCurso(false);
        if (ok !== undefined) vibrar(ok).catch(() => {});
        if (ok === false) setFallo(new Date());
      },
    });
  };
  return { enCurso, ejecutar, fallo };
}

// Estado de carga, error o vacío de una pantalla o sección (HU-69).
// - estado: 'cargando' | 'error' | 'vacio'.
// - titulo: el error (mensajeError) o el texto del vacío; en `cargando` es opcional.
// - mensaje: texto secundario opcional. icono: por defecto 'wifi-off' en error.
// - onReintentar (solo en error): pide otra vez lo que falló y devuelve true/false (o nada si la
//   pantalla pasa a su propio cargando). Mientras corre: spinner, «Reconectando…» y botón
//   deshabilitado. Si vuelve a fallar: vibración de error, sacudida y «Último intento: hh:mm».
// - accion (solo en vacío): { titulo, icono, onPress } como botón principal; `children` va debajo
//   (otras acciones o avisos).
// - compacta: una fila (spinner o texto + chip «Reintentar») para secciones dentro de una hoja.
//   Con `onCerrar` es el aviso «sin conexión» (borde de alerta y botón para cerrarlo; useRecargar).
// - completa: ocupa y centra todo el alto (carga de la app, Inicio, catálogo); con `fondo` pinta
//   el fondo del tema (carga de la app, donde no hay pantalla detrás).
export default function EstadoPantalla({
  estado,
  titulo,
  mensaje,
  icono,
  onReintentar,
  accion,
  onCerrar,
  compacta = false,
  completa = false,
  fondo = false,
  style,
  children,
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const { enCurso: reintentando, ejecutar: reintentar, fallo } = useIntento(onReintentar);
  const { estilo: estiloSacudida, sacudir } = useSacudida();

  useEffect(() => {
    if (fallo) sacudir();
  }, [fallo, sacudir]);

  const esError = estado === 'error' && onReintentar;
  const cargando = estado === 'cargando' || reintentando;
  const textoTitulo = reintentando ? 'Reconectando…' : titulo;
  const ultimoIntento =
    esError && fallo && !reintentando
      ? `Último intento: ${fallo.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })}`
      : null;

  if (compacta) {
    return (
      <Animated.View
        style={[styles.fila, onCerrar ? styles.aviso : null, style, estiloSacudida]}
        accessibilityLiveRegion="polite"
      >
        {cargando ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
        {textoTitulo ? (
          <Text style={[styles.textoFila, esError ? styles.flexible : null]} numberOfLines={2}>
            {textoTitulo}
          </Text>
        ) : null}
        {esError && !reintentando ? (
          <ChipSelector icono="refresh" etiqueta="Reintentar" onPress={reintentar} />
        ) : null}
        {onCerrar ? (
          <Pressable
            onPress={onCerrar}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cerrar aviso"
          >
            <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </Animated.View>
    );
  }

  const nombreIcono = icono ?? (estado === 'error' ? 'wifi-off' : null);
  return (
    <Animated.View
      style={[
        styles.bloque,
        completa ? styles.completa : null,
        fondo ? styles.fondo : null,
        style,
        estiloSacudida,
      ]}
      accessibilityLiveRegion="polite"
    >
      {cargando ? (
        <ActivityIndicator size="large" color={reintentando ? colors.textSecondary : colors.text} />
      ) : nombreIcono ? (
        <MaterialCommunityIcons name={nombreIcono} size={40} color={colors.textSecondary} />
      ) : null}
      {textoTitulo ? <Text style={styles.titulo}>{textoTitulo}</Text> : null}
      {mensaje && !reintentando ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
      {ultimoIntento ? <Text style={styles.mensaje}>{ultimoIntento}</Text> : null}
      {esError || (estado === 'vacio' && (accion || children)) ? (
        <View style={styles.acciones}>
          {esError ? (
            <Boton titulo="Reintentar" onPress={reintentar} disabled={reintentando} />
          ) : null}
          {estado === 'vacio' && accion ? (
            <Boton titulo={accion.titulo} icono={accion.icono} onPress={accion.onPress} />
          ) : null}
          {estado === 'vacio' ? children : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    bloque: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: 48,
      paddingHorizontal: espacios.sm + 4,
    },
    completa: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: espacios.xl,
    },
    fondo: {
      backgroundColor: colors.background,
    },
    titulo: {
      ...tipografia.headlineSm,
      letterSpacing: 0,
      color: colors.text,
      textAlign: 'center',
      marginTop: espacios.sm,
    },
    mensaje: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    acciones: {
      alignSelf: 'stretch',
      marginTop: espacios.sm + 4,
      gap: 10,
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    // Aviso «sin conexión» flotante: opaco para leerse sobre la lista, con borde de alerta.
    aviso: {
      padding: espacios.sm + 4,
      borderRadius: radios['2xl'],
      borderWidth: 1,
      borderColor: colors.alerta,
      backgroundColor: colors.surfaceLowest,
    },
    textoFila: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
    },
    flexible: {
      flex: 1,
    },
  });
