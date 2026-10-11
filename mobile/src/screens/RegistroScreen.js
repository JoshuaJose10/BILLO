import { StyleSheet, Text, View } from 'react-native';

export default function RegistroScreen() {
  return (
    <View style={styles.container}>
      <Text>Registro</Text>
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
