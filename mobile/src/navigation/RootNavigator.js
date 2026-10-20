import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PantallaCarga from '../components/PantallaCarga';
import { useAuth } from '../context/AuthContext';
import NuevoGastoScreen from '../screens/NuevoGastoScreen';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

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
          {/* Hoja inferior sobre Inicio: el fondo transparente deja ver la pantalla anterior
              y NuevoGastoScreen anima el blur y la hoja (por eso animation: 'none'). */}
          <Stack.Screen
            name="NuevoGasto"
            component={NuevoGastoScreen}
            options={{
              presentation: 'transparentModal',
              headerShown: false,
              animation: 'none',
              gestureEnabled: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
