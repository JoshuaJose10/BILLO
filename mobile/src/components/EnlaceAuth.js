import { StyleSheet, Text } from 'react-native';

import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';

// "¿No tienes cuenta? Crear cuenta": la parte enlazada en el acento, semibold y subrayada.
// Sin `pregunta` queda solo el enlace; sin `accion`, solo el texto (p. ej. una cuenta regresiva).
export default function EnlaceAuth({ pregunta, accion, onPress, style }) {
  const styles = useEstilos(crearEstilos);
  return (
    <Text style={[styles.texto, style]}>
      {pregunta}
      {pregunta && accion ? ' ' : null}
      {accion ? (
        <Text style={styles.enlace} onPress={onPress} accessibilityRole="link" suppressHighlighting>
          {accion}
        </Text>
      ) : null}
    </Text>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // mt-4, body-md (Inter 14/20) on-surface-variant
    texto: {
      fontFamily: fonts.sans,
      color: colors.textVariant,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: 16,
    },
    // font-semibold underline en el acento
    enlace: {
      fontFamily: fonts.sansSemiBold,
      color: colors.acentoTexto,
      textDecorationLine: 'underline',
    },
  });
