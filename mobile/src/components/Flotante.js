import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const VAIVEN = { duration: 2600, easing: Easing.inOut(Easing.quad) };

// Elemento decorativo que flota en bucle: sube y baja `amplitud` px y gira `giro` grados alrededor
// de su inclinación, desfasado según `indice`. Solo se mueve mientras `activa`; al desactivarse se
// cancela y vuelve al reposo. Con "Reducir movimiento" se queda quieto. `style` (posición,
// escala, rotación base, opacidad) va en la vista de afuera y el vaivén en la de adentro.
export default function Flotante({
  activa = true,
  indice = 0,
  amplitud = 6,
  giro = 1.5,
  style,
  children,
}) {
  const reducirMovimiento = useReducedMotion();
  const fase = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(fase);
    fase.set(0);
    if (!activa || reducirMovimiento) return undefined;
    fase.set(withDelay(indice * 450, withRepeat(withTiming(1, VAIVEN), -1, true)));
    return () => cancelAnimation(fase);
  }, [fase, activa, indice, reducirMovimiento]);

  const vaiven = useAnimatedStyle(() => {
    const p = fase.value * 2 - 1;
    return { transform: [{ translateY: p * amplitud }, { rotate: `${p * giro}deg` }] };
  });

  return (
    <Animated.View style={style}>
      <Animated.View style={vaiven}>{children}</Animated.View>
    </Animated.View>
  );
}
