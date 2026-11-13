import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// Sacudida corta para señalar un error (código inválido, Reintentar que volvió a fallar). Con
// "Reducir movimiento" no se anima. `estilo` va en un Animated.View; `sacudir()` la dispara.
const PASO = { duration: 50 };
const sacudida = () =>
  withSequence(
    withTiming(-8, PASO),
    withTiming(8, PASO),
    withTiming(-6, PASO),
    withTiming(6, PASO),
    withTiming(0, PASO),
  );

export function useSacudida() {
  const reducirMovimiento = useReducedMotion();
  const desplazamiento = useSharedValue(0);
  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: desplazamiento.get() }],
  }));
  const sacudir = useCallback(() => {
    if (!reducirMovimiento) desplazamiento.set(sacudida());
  }, [reducirMovimiento, desplazamiento]);
  return { estilo, sacudir };
}
