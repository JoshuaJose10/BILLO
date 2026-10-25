import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PantallaCarga from '../components/PantallaCarga';
import { useAuth } from '../context/AuthContext';
import NuevoGastoScreen from '../screens/NuevoGastoScreen';
import PerfilScreen from '../screens/PerfilScreen';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

// Hojas inferiores sobre Inicio: el fondo transparente deja ver la pantalla anterior
// y HojaInferior anima el blur y la hoja (por eso animation: 'none').
const opcionesHoja = {
  presentation: 'transparentModal',
  headerShown: false,
  animation: 'none',
  gestureEnabled: false,
  contentStyle: { backgroundColor: 'transparent' },
};

// Con token se muestran Main y las hojas (NuevoGasto, Perfil); sin token, Auth. Al cambiar
// el token React Navigation cambia de navegador solo, sin navigation.reset.
export default function RootNavigator() {
  const { token, cargando } = useAuth();

  if (cargando) return <PantallaCarga />;

  return (
    <Stack.Navigator>
      {token ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="NuevoGasto" component={NuevoGastoScreen} options={opcionesHoja} />
          <Stack.Screen name="Perfil" component={PerfilScreen} options={opcionesHoja} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
