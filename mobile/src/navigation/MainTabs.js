import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import NavbarFlotante from '../components/NavbarFlotante';
import CarteraScreen from '../screens/CarteraScreen';
import InicioScreen from '../screens/InicioScreen';
import MovimientosScreen from '../screens/MovimientosScreen';
import ReportesScreen from '../screens/ReportesScreen';
import { useTema } from '../theme/TemaContext';

const Tab = createBottomTabNavigator();

// Íconos: equivalentes de los Material Symbols del diseño (home, receipt_long, pie_chart,
// account_balance_wallet).

// Navbar flotante en lugar de la barra por defecto. El botón central no es una pestaña:
// abre la hoja NuevoGasto del stack raíz, que se dibuja encima de la navbar.
function renderNavbar(props) {
  return (
    <NavbarFlotante
      {...props}
      accionCentral={{
        icono: 'plus',
        accessibilityLabel: 'Nuevo gasto',
        onPress: () => props.navigation.navigate('NuevoGasto'),
      }}
    />
  );
}

export default function MainTabs() {
  const { colors } = useTema();
  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      tabBar={renderNavbar}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={InicioScreen}
        options={{ title: 'Inicio', tabBarIconName: 'home-outline' }}
      />
      <Tab.Screen
        name="Movimientos"
        component={MovimientosScreen}
        options={{ title: 'Movimientos', tabBarIconName: 'receipt-text-outline' }}
      />
      <Tab.Screen
        name="Reportes"
        component={ReportesScreen}
        options={{ title: 'Reportes', tabBarIconName: 'chart-pie-outline' }}
      />
      <Tab.Screen
        name="Cartera"
        component={CarteraScreen}
        options={{ title: 'Cartera', tabBarIconName: 'wallet-outline' }}
      />
    </Tab.Navigator>
  );
}
