import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import InicioScreen from '../screens/InicioScreen';
import MembresiasScreen from '../screens/MembresiasScreen';
import ReportesScreen from '../screens/ReportesScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator initialRouteName="Inicio">
      <Tab.Screen name="Inicio" component={InicioScreen} options={{ title: 'Inicio' }} />
      <Tab.Screen
        name="Membresias"
        component={MembresiasScreen}
        options={{ title: 'Membresías' }}
      />
      <Tab.Screen name="Reportes" component={ReportesScreen} options={{ title: 'Reportes' }} />
    </Tab.Navigator>
  );
}
