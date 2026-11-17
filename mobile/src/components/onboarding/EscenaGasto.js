import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

import { crearDatosEjemplo } from '../../datos/ejemplo';
import { tramo, useReloj } from '../../hooks/useReloj';
import { espacios } from '../../theme/colors';
import { formatearMontoCorto } from '../../utils/formato';
import ChipCategoria from '../ChipCategoria';
import MontoGrande from '../MontoGrande';
import TecladoNumerico from '../TecladoNumerico';

// Comida, Servicios y Transporte con lo gastado en cada una en los datos de ejemplo.
const datos = crearDatosEjemplo();
const CATEGORIAS = ['Comida', 'Servicios', 'Transporte'].map((nombre) => {
  const { id } = datos.categorias.find((c) => c.nombre === nombre);
  const total = datos.gastos.filter((g) => g.categoria_id === id).reduce((s, g) => s + g.monto, 0);
  return { nombre, nota: formatearMontoCorto(total) };
});

// Tiempos (ms): tecla 4, tecla 0, se elige Comida, «Guardado», pausa de 1.2 s y todo se desvanece.
const T4 = 600;
const T0 = 1300;
const CHIP = 2100;
const LISTO = 2700;
const SALIDA = 4300;
const CICLO = 4900;

// Pulso de una tecla: baja rápido y vuelve suave (0 → 1 → 0).
const pulso = (t, inicio) => {
  'worklet';
  return tramo(t, inicio, inicio + 90) - tramo(t, inicio + 90, inicio + 450);
};

function useTecla(t, inicio) {
  const hundir = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - 0.08 * pulso(t.value, inicio) }],
  }));
  const brillo = useAnimatedStyle(() => ({ opacity: pulso(t.value, inicio) }));
  return { hundir, pulso: brillo };
}

// Paso 2 del onboarding: el monto, los chips y el teclado reales de Nuevo gasto (solo gasto),
// animados con un reloj en el hilo de UI.
export default function EscenaGasto({ activa }) {
  const t = useReloj(activa, CICLO, SALIDA);
  const tecla4 = useTecla(t, T4);
  const tecla0 = useTecla(t, T0);
  // Lo tecleado, sin interpolar: $0 → $4 al tocar el 4 → $40 al tocar el 0.
  const valor = useDerivedValue(() => {
    if (t.value >= SALIDA + 200 || t.value < T4) return 0;
    return t.value < T0 ? 4 : 40;
  });
  const elegido = useAnimatedStyle(() => ({
    opacity: tramo(t.value, CHIP, CHIP + 300) - tramo(t.value, SALIDA, SALIDA + 400),
  }));
  const rebote = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.06 * pulso(t.value, CHIP - 60) }],
  }));
  const listo = useAnimatedStyle(() => {
    const p = tramo(t.value, LISTO, LISTO + 350) - tramo(t.value, SALIDA, SALIDA + 400);
    return { opacity: p, transform: [{ scale: 0.85 + 0.15 * p }] };
  });

  return (
    <View style={styles.escena}>
      <MontoGrande texto="40" valor={valor} etiqueta="Importe · MXN" />
      <View style={styles.chips}>
        {CATEGORIAS.map((c, i) =>
          i === 0 ? (
            <Animated.View key={c.nombre} style={rebote}>
              <ChipCategoria nombre={c.nombre} nota={c.nota} />
              <Animated.View style={[StyleSheet.absoluteFill, elegido]}>
                <ChipCategoria nombre={c.nombre} nota={c.nota} seleccionado />
              </Animated.View>
            </Animated.View>
          ) : (
            <ChipCategoria key={c.nombre} nombre={c.nombre} nota={c.nota} />
          ),
        )}
      </View>
      <TecladoNumerico disabled animadas={{ 4: tecla4, 0: tecla0 }} />
      <Animated.View style={[styles.listo, listo]}>
        <ChipCategoria nombre="Guardado" icono="check-circle" exito seleccionado />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  escena: {
    gap: espacios.sm + 4,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
  },
  listo: {
    alignItems: 'center',
  },
});
