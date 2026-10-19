import { StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';

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
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  enlace: {
    color: colors.text,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
