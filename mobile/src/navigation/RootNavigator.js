import { createNativeStackNavigator } from '@react-navigation/native-stack';

import EstadoPantalla from '../components/EstadoPantalla';
import { useAuth } from '../context/AuthContext';
import InvitacionCuentaScreen from '../screens/InvitacionCuentaScreen';
import AdminCatalogoScreen from '../screens/AdminCatalogoScreen';
import ElegirCategoriasScreen from '../screens/ElegirCategoriasScreen';
import MembresiaScreen from '../screens/MembresiaScreen';
import MisCategoriasScreen from '../screens/MisCategoriasScreen';
import NuevoGastoScreen from '../screens/NuevoGastoScreen';
import PerfilScreen from '../screens/PerfilScreen';
import PresupuestoScreen from '../screens/PresupuestoScreen';
import LaboratorioScreen from '../spike/LaboratorioScreen';
import { useTema } from '../theme/TemaContext';
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

// En el modo exploración (HU-50) las hojas que escriben y Perfil son la invitación a crear cuenta,
// con los mismos nombres de ruta para que las pantallas naveguen igual. InvitacionCuenta es la que
// abre FilaDeslizable al intentar eliminar.
const HOJAS_VISITANTE = [
  'NuevoGasto',
  'Perfil',
  'Presupuesto',
  'Membresia',
  'MisCategorias',
  'InvitacionCuenta',
];

// Cuenta recién creada (HU-89): el backend la marca con categorias_configuradas = false y, hasta
// que elige sus categorías, solo existe ElegirCategorias. Se compara con false porque las sesiones
// guardadas antes de HU-89 no traen el campo. El modo exploración nunca la muestra.
// Con token se muestran Main y las hojas (NuevoGasto, Perfil, Presupuesto, Membresia); en el modo
// exploración, Main con datos de ejemplo y la invitación en lugar de las hojas; si no, Auth. Al
// cambiar el token o el modo React Navigation cambia de navegador solo, sin navigation.reset.
export default function RootNavigator() {
  const { token, usuario, visitante, cargando } = useAuth();
  const { colors } = useTema();

  // HU-23 (spike): pantalla de pruebas de voz y widget, solo en desarrollo.
  const opcionesLaboratorio = {
    title: 'Laboratorio (spike)',
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
  };

  // Spinner a pantalla completa mientras se cargan las fuentes o la sesión guardada.
  if (cargando) {
    return <EstadoPantalla estado="cargando" completa fondo />;
  }

  return (
    <Stack.Navigator>
      {token && usuario?.categorias_configuradas === false ? (
        <Stack.Screen
          name="ElegirCategorias"
          component={ElegirCategoriasScreen}
          options={{ headerShown: false }}
        />
      ) : token ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="NuevoGasto" component={NuevoGastoScreen} options={opcionesHoja} />
          <Stack.Screen name="Perfil" component={PerfilScreen} options={opcionesHoja} />
          <Stack.Screen name="Presupuesto" component={PresupuestoScreen} options={opcionesHoja} />
          <Stack.Screen name="Membresia" component={MembresiaScreen} options={opcionesHoja} />
          <Stack.Screen
            name="AdminCatalogo"
            component={AdminCatalogoScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MisCategorias"
            component={MisCategoriasScreen}
            options={{ headerShown: false }}
          />
          {__DEV__ ? (
            <Stack.Screen
              name="Laboratorio"
              component={LaboratorioScreen}
              options={opcionesLaboratorio}
            />
          ) : null}
        </>
      ) : visitante ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          {HOJAS_VISITANTE.map((nombre) => (
            <Stack.Screen
              key={nombre}
              name={nombre}
              component={InvitacionCuentaScreen}
              options={opcionesHoja}
            />
          ))}
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
