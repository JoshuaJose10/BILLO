import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import NuevoGastoScreen from '../screens/NuevoGastoScreen';
import { colors } from '../theme/colors';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

function PantallaCarga() {
  return (
    <View style={styles.carga}>
      <ActivityIndicator size="large" color={colors.text} />
    </View>
  );
}

// Con token se muestran Main y NuevoGasto; sin token, Auth. Al cambiar el token
// React Navigation cambia de navegador solo, sin navigation.reset.
export default function RootNavigator() {
  const { token, cargando } = useAuth();

  if (cargando) return <PantallaCarga />;

  return (
    <Stack.Navigator>
      {token ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="NuevoGasto"
            component={NuevoGastoScreen}
            options={{ title: 'Nuevo gasto' }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
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
