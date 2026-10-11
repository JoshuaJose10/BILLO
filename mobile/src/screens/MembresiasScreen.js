import { StyleSheet, Text, View } from 'react-native';

export default function MembresiasScreen() {
  return (
    <View style={styles.container}>
      <Text>Membresías</Text>
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
