import { Button, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';

export default function InicioScreen({ navigation }) {
  const { usuario, cerrarSesion } = useAuth();

  return (
    <View style={styles.container}>
      <Text>Inicio{usuario?.nombre ? ` — Hola, ${usuario.nombre}` : ''}</Text>
      <Button title="Nuevo gasto" onPress={() => navigation.navigate('NuevoGasto')} />
      {/* TEMPORAL: se moverá a Perfil/Ajustes cuando exista esa pantalla. */}
      <Button title="Cerrar sesión" color="#DC2626" onPress={cerrarSesion} />
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
