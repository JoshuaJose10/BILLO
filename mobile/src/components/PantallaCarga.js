import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';

// Spinner a pantalla completa mientras se cargan las fuentes o la sesión guardada.
export default function PantallaCarga() {
  return (
    <View style={styles.carga}>
      <ActivityIndicator size="large" color={colors.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  carga: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
