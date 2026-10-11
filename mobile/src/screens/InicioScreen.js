import { Button, StyleSheet, Text, View } from 'react-native';

export default function InicioScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text>Inicio</Text>
      <Button title="Nuevo gasto" onPress={() => navigation.navigate('NuevoGasto')} />
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
