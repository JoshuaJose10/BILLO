import { createNativeStackNavigator } from '@react-navigation/native-stack';

import NuevoGastoScreen from '../screens/NuevoGastoScreen';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Auth">
      <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="NuevoGasto"
        component={NuevoGastoScreen}
        options={{ title: 'Nuevo gasto' }}
      />
    </Stack.Navigator>
  );
}
