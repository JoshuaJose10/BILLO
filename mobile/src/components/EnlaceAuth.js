import { StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

// "¿No tienes cuenta? Crear cuenta": la parte enlazada en blanco y subrayada.
export default function EnlaceAuth({ pregunta, accion, onPress }) {
  return (
    <Text style={styles.texto}>
      {pregunta}{' '}
      <Text style={styles.enlace} onPress={onPress} accessibilityRole="link" suppressHighlighting>
        {accion}
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  texto: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  enlace: {
    fontFamily: fonts.sansSemiBold,
    color: colors.text,
    textDecorationLine: 'underline',
  },
});
