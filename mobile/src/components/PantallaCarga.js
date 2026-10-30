import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useEstilos, useTema } from '../theme/TemaContext';

// Spinner a pantalla completa mientras se cargan las fuentes o la sesión guardada.
export default function PantallaCarga() {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.carga}>
      <ActivityIndicator size="large" color={colors.text} />
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    carga: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
  });
