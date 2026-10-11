import { StyleSheet, Text, View } from 'react-native';

export default function ReportesScreen() {
  return (
    <View style={styles.container}>
      <Text>Reportes</Text>
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
