import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { espacios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import Boton from './Boton';
import ChipSelector from './ChipSelector';

// Estado de carga, error o vacío de una pantalla o sección (HU-69).
// - estado: 'cargando' | 'error' | 'vacio'.
// - titulo: el error (mensajeError) o el texto del vacío; en `cargando` es opcional.
// - mensaje: texto secundario opcional. icono: por defecto 'wifi-off' en error.
// - onReintentar (solo en error): pide otra vez lo que falló. Si devuelve una promesa, el botón
//   muestra cargando hasta que termina (el error sigue a la vista, sin parpadeo).
// - accion (solo en vacío): { titulo, icono, onPress } como botón principal; `children` va debajo
//   (otras acciones o avisos).
// - compacta: una fila (spinner o texto + chip «Reintentar») para secciones dentro de una hoja.
// - completa: ocupa y centra todo el alto (carga de la app, Inicio, catálogo); con `fondo` pinta
//   el fondo del tema (carga de la app, donde no hay pantalla detrás).
export default function EstadoPantalla({
  estado,
  titulo,
  mensaje,
  icono,
  onReintentar,
  accion,
  compacta = false,
  completa = false,
  fondo = false,
  style,
  children,
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const [reintentando, setReintentando] = useState(false);

  const reintentar = async () => {
    if (reintentando) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setReintentando(true);
    try {
      await onReintentar();
    } finally {
      setReintentando(false);
    }
  };

  const esError = estado === 'error' && onReintentar;

  if (compacta) {
    return (
      <View style={[styles.fila, style]} accessibilityLiveRegion="polite">
        {estado === 'cargando' || reintentando ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : null}
        {titulo ? (
          <Text style={[styles.textoFila, esError ? styles.flexible : null]} numberOfLines={2}>
            {titulo}
          </Text>
        ) : null}
        {esError && !reintentando ? (
          <ChipSelector icono="refresh" etiqueta="Reintentar" onPress={reintentar} />
        ) : null}
      </View>
    );
  }

  const nombreIcono = icono ?? (estado === 'error' ? 'wifi-off' : null);
  return (
    <View
      style={[styles.bloque, completa ? styles.completa : null, fondo ? styles.fondo : null, style]}
      accessibilityLiveRegion="polite"
    >
      {estado === 'cargando' ? (
        <ActivityIndicator size="large" color={colors.text} />
      ) : nombreIcono ? (
        <MaterialCommunityIcons name={nombreIcono} size={40} color={colors.textSecondary} />
      ) : null}
      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
      {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
      {esError || (estado === 'vacio' && (accion || children)) ? (
        <View style={styles.acciones}>
          {esError ? (
            <Boton titulo="Reintentar" onPress={reintentar} cargando={reintentando} />
          ) : null}
          {estado === 'vacio' && accion ? (
            <Boton titulo={accion.titulo} icono={accion.icono} onPress={accion.onPress} />
          ) : null}
          {estado === 'vacio' ? children : null}
        </View>
      ) : null}
    </View>
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
    textoFila: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
    },
    flexible: {
      flex: 1,
    },
  });
