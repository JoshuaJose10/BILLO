import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import Avatar from '../components/Avatar';
import Boton from '../components/Boton';
import HojaInferior from '../components/HojaInferior';
import Input from '../components/Input';
import PanelHoja from '../components/PanelHoja';
import { useApi, useAuth } from '../context/AuthContext';
import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { esAdmin } from '../utils/auth';
import { mensajeError } from '../utils/errores';

// Hoja inferior de Perfil (ruta Perfil con presentation: 'transparentModal'), se abre
// desde el avatar de Inicio. Al cerrar sesión el token se borra y RootNavigator muestra Login.
export default function PerfilScreen({ navigation }) {
  const { usuario, token, cerrarSesion } = useAuth();
  const api = useApi();
  const styles = useEstilos(crearEstilos);
  const esAdministrador = esAdmin(token);

  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [password, setPassword] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [errorApi, setErrorApi] = useState('');

  const confirmarCerrarSesion = () =>
    Alert.alert('¿Cerrar sesión?', 'Tendrás que ingresar tu correo y contraseña de nuevo.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: cerrarSesion },
    ]);

  const handleEliminarCuenta = async () => {
    if (eliminando) return;
    if (!password) {
      setErrorApi('Ingresa tu contraseña para confirmar.');
      return;
    }
    setEliminando(true);
    setErrorApi('');
    try {
      await api('/auth/cuenta', {
        method: 'DELETE',
        body: { password },
      });
      setEliminando(false);
      setMostrarConfirmacion(false);
      await cerrarSesion();
    } catch (error) {
      setEliminando(false);
      setErrorApi(mensajeError(error?.code, error?.message));
    }
  };

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

      {/* HU-49: opción de administración del catálogo exclusiva para administradores */}
      {esAdministrador ? (
        <View style={styles.seccionAdmin}>
          <Boton
            titulo="Administrar catálogo"
            icono="shape-outline"
            onPress={() => {
              navigation.goBack();
              navigation.navigate('AdminCatalogo');
            }}
          />
        </View>
      ) : null}

      <Boton titulo="Cerrar sesión" icono="logout" onPress={confirmarCerrarSesion} secundario />

      <View style={styles.seccionEliminar}>
        <Boton
          titulo="Eliminar mi cuenta"
          icono="account-remove-outline"
          onPress={() => {
            setErrorApi('');
            setPassword('');
            setMostrarConfirmacion(true);
          }}
          destructivo
        />
      </View>

      {/* HU-23 (spike): acceso a la pantalla de pruebas, solo en desarrollo. */}
      {__DEV__ ? (
        <View style={styles.laboratorio}>
          <Boton
            titulo="Laboratorio (spike)"
            icono="flask-outline"
            onPress={() => navigation.navigate('Laboratorio')}
            secundario
          />
        </View>
      ) : null}

      {mostrarConfirmacion ? (
        <PanelHoja
          titulo="Eliminar cuenta"
          onCerrar={() => {
            if (!eliminando) {
              setMostrarConfirmacion(false);
              setPassword('');
              setErrorApi('');
            }
          }}
        >
          <Text style={styles.textoAdvertencia}>
            Esta acción es irreversible. Se eliminarán permanentemente tus gastos, presupuestos,
            suscripciones y tu cuenta.
          </Text>
          <Input
            etiqueta="Contraseña actual"
            icono="lock-outline"
            password
            placeholder="Ingresa tu contraseña"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errorApi) setErrorApi('');
            }}
            error={errorApi}
            autoCapitalize="none"
          />
          <View style={styles.accionesConfirmacion}>
            <Boton
              titulo="Eliminar definitivamente"
              icono="trash-can-outline"
              onPress={handleEliminarCuenta}
              cargando={eliminando}
              disabled={eliminando}
              destructivo
            />
            <Boton
              titulo="Cancelar"
              onPress={() => {
                setMostrarConfirmacion(false);
                setPassword('');
                setErrorApi('');
              }}
              disabled={eliminando}
              secundario
            />
          </View>
        </PanelHoja>
      ) : null}
    </HojaInferior>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
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
    laboratorio: {
      marginTop: 12,
    },
    seccionAdmin: {
      marginBottom: 12,
    },
    seccionEliminar: {
      marginTop: 12,
    },
    textoAdvertencia: {
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    accionesConfirmacion: {
      marginTop: 16,
      gap: 10,
    },
  });
