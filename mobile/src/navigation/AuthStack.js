import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import { useAuth } from '../context/AuthContext';
import RegistroScreen from '../screens/RegistroScreen';
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
    </Stack.Navigator>
  );
}
