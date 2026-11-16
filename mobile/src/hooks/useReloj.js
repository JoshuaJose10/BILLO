import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

export const SUAVE = Easing.out(Easing.cubic);

// Reloj de una escena animada (onboarding, HU-93): `t` avanza de 0 a `ciclo` ms en el hilo de UI y
// vuelve a 0, en bucle, solo mientras `activa`. Al desactivarse se cancela y regresa a 0, así que
// al volver a entrar arranca desde el principio. Con "Reducir movimiento" queda fijo en `final`
// (el estado completo de la escena), sin bucle. Cada elemento deriva su estilo de `t` con tramo().
export function useReloj(activa, ciclo, final = ciclo) {
  const reducirMovimiento = useReducedMotion();
  const t = useSharedValue(reducirMovimiento ? final : 0);

  useEffect(() => {
    cancelAnimation(t);
    if (reducirMovimiento) {
      t.set(final);
      return undefined;
    }
    t.set(0);
    if (activa) {
      t.set(withRepeat(withTiming(ciclo, { duration: ciclo, easing: Easing.linear }), -1));
    }
    return () => cancelAnimation(t);
  }, [t, activa, ciclo, final, reducirMovimiento]);

  return t;
}

// Avance de 0 a 1 entre `desde` y `hasta` ms del reloj, con `easing` (worklet).
// Sin valor por defecto en la firma: el plugin de worklets no captura lo que se usa en los
// parámetros por defecto, y SUAVE quedaba indefinido en el hilo de UI.
export function tramo(t, desde, hasta, easing) {
  'worklet';
  if (t <= desde) return 0;
  if (t >= hasta) return 1;
  const curva = easing ?? SUAVE;
  return curva((t - desde) / (hasta - desde));
}
