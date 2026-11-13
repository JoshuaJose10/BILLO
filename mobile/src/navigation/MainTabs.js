import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';

import NavbarFlotante from '../components/NavbarFlotante';
import { useCategorias } from '../context/CategoriasContext';
import CarteraScreen from '../screens/CarteraScreen';
import InicioScreen from '../screens/InicioScreen';
import MovimientosScreen from '../screens/MovimientosScreen';
import ReportesScreen from '../screens/ReportesScreen';
import { cargarVoz } from '../services/reconocimientoVoz';
import { useTema } from '../theme/TemaContext';
import { iconoCategoria } from '../utils/categorias';

const Tab = createBottomTabNavigator();

// Íconos: equivalentes de los Material Symbols del diseño (home, receipt_long, pie_chart,
// account_balance_wallet).

// Navbar flotante en lugar de la barra por defecto. El botón central no es una pestaña:
// abre la hoja NuevoGasto del stack raíz, que se dibuja encima de la navbar.
// Mantenerlo presionado (HU-92) abre el abanico con las categorías más usadas (caché de
// CategoriasProvider, al instante) y «Por voz» si el binario trae el módulo de voz (no en Expo Go).
// En el modo exploración NuevoGasto es la invitación a crear cuenta, así que el abanico lleva ahí.
function Navbar(props) {
  const { frecuentes } = useCategorias();
  const { navigation } = props;
  const accionCentral = useMemo(
    () => ({
      icono: 'plus',
      accessibilityLabel: 'Nuevo gasto',
      onPress: () => navigation.navigate('NuevoGasto'),
      acciones: [
        ...frecuentes.map((c) => ({
          clave: `categoria-${c.id}`,
          icono: iconoCategoria(c.nombre),
          etiqueta: c.nombre,
          params: { categoriaId: c.id },
        })),
        ...(cargarVoz()
          ? [
              {
                clave: 'voz',
                icono: 'microphone',
                etiqueta: 'Por voz',
                params: { iniciarVoz: true },
              },
            ]
          : []),
      ],
      onElegir: (accion) => navigation.navigate('NuevoGasto', accion.params),
    }),
    [frecuentes, navigation],
  );
  return <NavbarFlotante {...props} accionCentral={accionCentral} />;
}

function renderNavbar(props) {
  return <Navbar {...props} />;
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
