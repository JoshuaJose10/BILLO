import { useState } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EstadoPantalla, { useIntento } from '../components/EstadoPantalla';
import { useTema } from '../theme/TemaContext';
import { avisoVisible } from '../utils/estadoCarga';

// Entra deslizándose desde arriba; con "Reducir movimiento" (ReduceMotion.System) aparece sin animar.
const ENTRADA = SlideInUp.duration(220);

// Jalar para recargar y aviso «sin conexión» de Inicio, Movimientos, Cartera y Reportes (HU-69).
// - recargar: vuelve a pedir y devuelve true/false (las cargas de las pantallas).
// - error: el error actual de apiFetch o null. hayDatos: hay datos a la vista.
// Devuelve:
// - propsLista: { style, refreshControl } para la lista. Empieza bajo la barra de estado para que el
//   indicador de iOS no quede tapado por ella (Dynamic Island). `refreshing` sigue en true hasta que
//   la carga responde; vibra al soltar y con éxito o error al terminar.
// - aviso: si falla con datos a la vista, franja fija arriba con Reintentar que se puede cerrar
//   (EstadoPantalla compacta). Va al final de la vista raíz de la pantalla.
export function useRecargar(recargar, { error, hayDatos }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTema();
  const { enCurso, ejecutar } = useIntento(recargar);
  const [cerrado, setCerrado] = useState(false);
  // Ajuste durante el render (sin efecto): al resolverse el error, el siguiente vuelve a mostrarse.
  if (cerrado && !error) setCerrado(false);

  const refrescar = () => {
    setCerrado(false);
    ejecutar();
  };

  return {
    propsLista: {
      style: { marginTop: insets.top },
      refreshControl: (
        <RefreshControl
          refreshing={enCurso}
          onRefresh={refrescar}
          tintColor={colors.text}
          colors={[colors.text]}
          progressBackgroundColor={colors.surfaceHigh}
        />
      ),
    },
    aviso: avisoVisible({ error, hayDatos, cerrado }) ? (
      <Animated.View entering={ENTRADA} style={[styles.aviso, { top: insets.top + 8 }]}>
        <EstadoPantalla
          estado="error"
          error={error}
          onReintentar={recargar}
          onCerrar={() => setCerrado(true)}
          compacta
        />
      </Animated.View>
    ) : null,
  };
}

const styles = StyleSheet.create({
  aviso: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
});
