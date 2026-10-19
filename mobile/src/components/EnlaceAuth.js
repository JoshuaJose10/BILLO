import { StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

// "¿No tienes cuenta? Crear cuenta": la parte enlazada en blanco, semibold y subrayada.
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
  // mt-4, body-md (Inter 14/20) on-surface-variant
  texto: {
    fontFamily: fonts.sans,
    color: colors.textVariant,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 16,
  },
  // text-primary font-semibold underline
  enlace: {
    fontFamily: fonts.sansSemiBold,
    color: colors.text,
    textDecorationLine: 'underline',
  },
});
