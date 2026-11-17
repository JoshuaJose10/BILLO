import { StyleSheet, TextInput } from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';

const TextInputAnimado = Animated.createAnimatedComponent(TextInput);

// Texto que cambia en el hilo de UI, sin re-render por cuadro: `formatear(valor)` (worklet) arma el
// texto a partir del shared value `valor`. Por ejemplo un monto que cuenta o un dictado que se
// escribe letra por letra. Es un TextInput de solo lectura; `style` es el de un Text.
export default function TextoAnimado({ valor, formatear, style }) {
  const props = useAnimatedProps(() => ({ text: formatear(valor.value) }));
  return (
    <TextInputAnimado
      editable={false}
      pointerEvents="none"
      underlineColorAndroid="transparent"
      animatedProps={props}
      style={[styles.base, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 0,
    margin: 0,
  },
});
