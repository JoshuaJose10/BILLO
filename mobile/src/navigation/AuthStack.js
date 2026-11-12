import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import OlvideContrasenaScreen from '../screens/OlvideContrasenaScreen';
import RegistroScreen from '../screens/RegistroScreen';
import RestablecerScreen from '../screens/RestablecerScreen';
import { useTema } from '../theme/TemaContext';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  const { colors } = useTema();
  // Login, o Registro si se llega desde "Crear cuenta" del modo exploración.
  const { entradaAuth } = useAuth();
  return (
    <Stack.Navigator
      initialRouteName={entradaAuth}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Registro" component={RegistroScreen} />
      {/* Recuperar contraseña (HU-65) */}
      <Stack.Screen name="OlvideContrasena" component={OlvideContrasenaScreen} />
      <Stack.Screen name="Restablecer" component={RestablecerScreen} />
    </Stack.Navigator>
  );
}
