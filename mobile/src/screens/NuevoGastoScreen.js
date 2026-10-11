import { StyleSheet, Text, View } from 'react-native';

export default function NuevoGastoScreen() {
  return (
    <View style={styles.container}>
      <Text>Nuevo gasto</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
