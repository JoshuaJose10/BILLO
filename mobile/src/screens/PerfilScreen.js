import { Alert, StyleSheet, Text, View } from 'react-native';

import Avatar from '../components/Avatar';
import Boton from '../components/Boton';
import HojaInferior from '../components/HojaInferior';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

// Hoja inferior de Perfil (ruta Perfil con presentation: 'transparentModal'), se abre
// desde el avatar de Inicio. Al cerrar sesión el token se borra y RootNavigator muestra Login.
export default function PerfilScreen({ navigation }) {
  const { usuario, cerrarSesion } = useAuth();

  const confirmarCerrarSesion = () =>
    Alert.alert('¿Cerrar sesión?', 'Tendrás que ingresar tu correo y contraseña de nuevo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: cerrarSesion },
    ]);

  return (
    <HojaInferior
      titulo="Perfil"
      etiquetaFondo="Cerrar perfil"
      onCerrada={() => navigation.goBack()}
    >
      <View style={styles.datos}>
        <Avatar nombre={usuario?.nombre} tamano={80} />
        <Text style={styles.nombre} numberOfLines={1}>
          {usuario?.nombre || 'Sin nombre'}
        </Text>
        {usuario?.email ? (
          <Text style={styles.correo} numberOfLines={1}>
            {usuario.email}
          </Text>
        ) : null}
      </View>

      <Boton titulo="Cerrar sesión" icono="logout" onPress={confirmarCerrarSesion} secundario />
    </HojaInferior>
  );
}

const styles = StyleSheet.create({
  datos: {
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    marginBottom: 28,
  },
  // headline-md: Inter 22/28 semibold
  nombre: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.33,
    color: colors.text,
    marginTop: 12,
  },
  // body-md text-zinc-400
  correo: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
