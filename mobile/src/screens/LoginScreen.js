import { Button, StyleSheet, Text, View } from 'react-native';

export default function LoginScreen({ navigation }) {
  // TEMPORAL: HU-13 lo reemplaza por el login real.
  const entrar = () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] });

  return (
    <View style={styles.container}>
      <Text>Login</Text>
      <Button title="Entrar" onPress={entrar} />
      <Button title="Crear cuenta" onPress={() => navigation.navigate('Registro')} />
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
