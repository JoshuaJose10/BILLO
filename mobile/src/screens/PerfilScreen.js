import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import appConfig from '../../app.json';
import Avatar from '../components/Avatar';
import Boton from '../components/Boton';
import FuerzaPassword from '../components/FuerzaPassword';
import HojaInferior from '../components/HojaInferior';
import Input from '../components/Input';
import PanelHoja from '../components/PanelHoja';
import { useApi, useAuth } from '../context/AuthContext';
import { MODO_VISITANTE } from '../services/api';
import { radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useEstilos, useTema } from '../theme/TemaContext';
import { esAdmin } from '../utils/auth';
import { MONEDAS_DISPONIBLES } from '../utils/divisas';
import { mensajeError, textosError } from '../utils/errores';
import {
  descripcionMonedaPreferida,
  estadoNotificaciones,
  MODOS_TEMA,
  obtenerInfoAcercaDe,
} from '../utils/preferencias';
import { MAX_NOMBRE, validarCambioContrasena, validarEditarNombre } from '../utils/validacion';

// Hoja inferior de Perfil (ruta Perfil con presentation: 'transparentModal'), se abre
// desde el avatar de Inicio. Permite editar nombre, cambiar contraseña, exportar datos en CSV,
// ajustar tema, moneda preferida, notificaciones, consultar Acerca de Billo, administrar catálogo
// (admin), eliminar cuenta y cerrar sesión (HU-87 / feature/perfil-cuenta-exportar).
export default function PerfilScreen({ navigation }) {
  const { usuario, token, visitante, actualizarUsuario, cerrarSesion, salirDeVisitante } =
    useAuth();
  const api = useApi();
  const { colors, modoTema, cambiarModoTema, monedaPreferida, cambiarMonedaPreferida } = useTema();
  const styles = useEstilos(crearEstilos);
  const esAdministrador = esAdmin(token);
  const enModoVisitante = Boolean(visitante || !token);

  const versionApp = Constants.expoConfig?.version || appConfig?.expo?.version || '1.0.0';
  const infoAcercaDe = obtenerInfoAcercaDe(versionApp);
  const infoMoneda = descripcionMonedaPreferida(monedaPreferida);

  // Panel flotante activo: null | 'moneda' | 'acerca' | 'eliminar' | 'nombre' | 'password'
  const [panel, setPanel] = useState(null);
  const [permisoNotif, setPermisoNotif] = useState(null);
  const [avisoExito, setAvisoExito] = useState('');

  // Estado de Editar nombre
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [errorCampoNombre, setErrorCampoNombre] = useState('');
  const [errorNombreApi, setErrorNombreApi] = useState(null);
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  // Estado de Cambiar contraseña
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [erroresPassword, setErroresPassword] = useState({});
  const [errorPasswordApi, setErrorPasswordApi] = useState(null);
  const [guardandoPassword, setGuardandoPassword] = useState(false);

  // Estado de Exportar mis datos
  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState(null);

  // Estado de Eliminar cuenta
  const [password, setPassword] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [errorApi, setErrorApi] = useState('');

  const ocupado = guardandoNombre || guardandoPassword || exportando || eliminando;

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;
    let activo = true;
    const actualizarPermiso = () => {
      Notifications.getPermissionsAsync()
        .then(({ status }) => {
          if (activo) setPermisoNotif(status);
        })
        .catch(() => {
          if (activo) setPermisoNotif(null);
        });
    };
    actualizarPermiso();
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        actualizarPermiso();
      }
    });
    return () => {
      activo = false;
      suscripcion.remove();
    };
  }, []);

  const infoNotif = estadoNotificaciones(permisoNotif);

  const avisarModoVisitante = () => {
    Alert.alert('Requiere una cuenta', mensajeError(MODO_VISITANTE), [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Crear cuenta',
        onPress: () => {
          navigation.goBack();
          salirDeVisitante?.('Registro');
        },
      },
    ]);
  };

  const abrirEditarNombre = () => {
    if (enModoVisitante) {
      avisarModoVisitante();
      return;
    }
    setNuevoNombre(usuario?.nombre || '');
    setErrorCampoNombre('');
    setErrorNombreApi(null);
    setAvisoExito('');
    setPanel('nombre');
  };

  const handleGuardarNombre = async () => {
    if (guardandoNombre) return;
    const validacion = validarEditarNombre(nuevoNombre);
    if (!validacion.valido) {
      setErrorCampoNombre(validacion.error);
      return;
    }
    setGuardandoNombre(true);
    setErrorCampoNombre('');
    setErrorNombreApi(null);
    try {
      const resp = await api('/auth/perfil', {
        method: 'PUT',
        body: { nombre: validacion.nombre },
      });
      const actualizado = resp?.usuario || { ...usuario, nombre: validacion.nombre };
      await actualizarUsuario?.({ nombre: actualizado.nombre });
      setGuardandoNombre(false);
      setPanel(null);
      setAvisoExito('Tu nombre se actualizó correctamente.');
    } catch (err) {
      setGuardandoNombre(false);
      if (err?.code === 'NOMBRE_INVALIDO' || err?.code === 'NOMBRE_REQUERIDO') {
        setErrorCampoNombre(mensajeError(err.code, err.message));
      } else {
        setErrorNombreApi(err);
      }
    }
  };

  const abrirCambiarPassword = () => {
    if (enModoVisitante) {
      avisarModoVisitante();
      return;
    }
    setPasswordActual('');
    setPasswordNueva('');
    setPasswordConfirmar('');
    setErroresPassword({});
    setErrorPasswordApi(null);
    setAvisoExito('');
    setPanel('password');
  };

  const handleCambiarPassword = async () => {
    if (guardandoPassword) return;
    const validacion = validarCambioContrasena({
      actual: passwordActual,
      nueva: passwordNueva,
      confirmacion: passwordConfirmar,
    });
    if (!validacion.valido) {
      setErroresPassword(validacion.errores);
      return;
    }
    setGuardandoPassword(true);
    setErroresPassword({});
    setErrorPasswordApi(null);
    try {
      await api('/auth/cambiar-contrasena', {
        method: 'POST',
        body: {
          contrasena_actual: passwordActual,
          contrasena_nueva: passwordNueva,
        },
      });
      setGuardandoPassword(false);
      setPanel(null);
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirmar('');
      setAvisoExito('Contraseña actualizada correctamente.');
      Alert.alert('Contraseña actualizada', 'Tu contraseña se actualizó correctamente.');
    } catch (err) {
      setGuardandoPassword(false);
      if (err?.code === 'CONTRASENA_ACTUAL_INCORRECTA' || err?.code === 'PASSWORD_INCORRECTA') {
        setErroresPassword({ actual: mensajeError(err.code, err.message) });
      } else if (err?.code === 'CONTRASENA_INVALIDA' || err?.code === 'PASSWORD_MUY_CORTA') {
        setErroresPassword({ nueva: mensajeError(err.code, err.message) });
      } else {
        setErrorPasswordApi(err);
      }
    }
  };

  const handleExportarDatos = async () => {
    if (exportando) return;
    if (enModoVisitante) {
      avisarModoVisitante();
      return;
    }
    setExportando(true);
    setErrorExportar(null);
    setAvisoExito('');
    try {
      const csvTexto = await api('/exportar?formato=csv', { respuestaTexto: true });
      setExportando(false);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob([csvTexto], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'billo-datos.csv';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          title: 'billo-datos.csv',
          message: csvTexto,
        });
      }
    } catch (err) {
      setExportando(false);
      setErrorExportar(err);
    }
  };

  const abrirAjustesNotificaciones = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Ajustes del sistema',
        'Abre los ajustes de tu teléfono y busca Billo para configurar las notificaciones.',
      );
    }
  };

  const abrirEnlaceAyuda = async () => {
    try {
      await Linking.openURL(infoAcercaDe.enlaceAyuda);
    } catch {
      // Si el dispositivo no puede abrir el navegador se ignora sin romper la vista.
    }
  };

  const abrirMisCategorias = () => {
    navigation.goBack();
    navigation.navigate('MisCategorias');
  };

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
      setPanel(null);
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
      bloqueada={ocupado}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContenido}
      >
        {/* Tarjeta de datos del usuario y versión de la app */}
        <View style={styles.tarjetaUsuario}>
          <Avatar nombre={usuario?.nombre} tamano={72} />
          <View style={styles.filaNombre}>
            <Text style={styles.nombre} numberOfLines={1}>
              {usuario?.nombre || 'Sin nombre'}
            </Text>
            {!enModoVisitante ? (
              <Pressable
                onPress={abrirEditarNombre}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Editar nombre"
                style={({ pressed }) => [
                  styles.botonEditarNombre,
                  pressed ? styles.opcionTemaPresionada : null,
                ]}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={15}
                  color={colors.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>
          {usuario?.email ? (
            <Text style={styles.correo} numberOfLines={1}>
              {usuario.email}
            </Text>
          ) : null}
          <View style={styles.filaInsignias}>
            <View style={styles.insigniaVersion}>
              <MaterialCommunityIcons name="tag-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.textoVersion}>Versión {infoAcercaDe.version}</Text>
            </View>
            {esAdministrador ? (
              <View style={styles.insigniaAdmin}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={13}
                  color={colors.acentoTexto}
                />
                <Text style={styles.textoInsigniaAdmin}>Admin</Text>
              </View>
            ) : null}
          </View>
        </View>

        {avisoExito ? (
          <View style={styles.bannerExito} accessibilityLiveRegion="polite">
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={18}
              color={colors.exitoTexto}
            />
            <Text style={styles.bannerExitoTexto}>{avisoExito}</Text>
          </View>
        ) : null}

        {/* Sección de Ajustes */}
        <Text style={styles.tituloSeccion}>Preferencias</Text>

        <View style={styles.bloqueAjuste}>
          <View style={styles.cabeceraAjuste}>
            <MaterialCommunityIcons
              name="theme-light-dark"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles.etiquetaAjuste}>Tema de la aplicación</Text>
          </View>
          <View style={styles.selectorTema}>
            {MODOS_TEMA.map((m) => {
              const activo = modoTema === m.valor;
              return (
                <Pressable
                  key={m.valor}
                  onPress={() => cambiarModoTema(m.valor)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={`Tema ${m.etiqueta}`}
                  style={({ pressed }) => [
                    styles.opcionTema,
                    activo ? styles.opcionTemaActiva : null,
                    pressed && !activo ? styles.opcionTemaPresionada : null,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={m.icono}
                    size={16}
                    color={activo ? colors.acentoTexto : colors.textSecondary}
                  />
                  <Text style={[styles.textoTema, activo ? styles.textoTemaActivo : null]}>
                    {m.etiqueta}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Moneda preferida */}
        <Pressable
          onPress={() => setPanel('moneda')}
          accessibilityRole="button"
          accessibilityLabel={`Moneda preferida: ${infoMoneda.etiqueta}`}
          style={({ pressed }) => [styles.filaAjuste, pressed ? styles.filaAjustePresionada : null]}
        >
          <View style={styles.iconoAjusteCirculo}>
            <MaterialCommunityIcons name="cash-multiple" size={20} color={colors.text} />
          </View>
          <View style={styles.columnaAjuste}>
            <Text style={styles.etiquetaAjuste}>Moneda preferida</Text>
            <Text style={styles.subtextoAjuste} numberOfLines={1}>
              Por defecto en Nuevo gasto · {infoMoneda.etiqueta}
            </Text>
          </View>
          <View style={styles.pastillaValor}>
            <Text style={styles.textoPastillaValor}>{infoMoneda.codigo}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </View>
        </Pressable>

        {/* Mis categorías (HU-90) */}
        <Pressable
          onPress={abrirMisCategorias}
          accessibilityRole="button"
          accessibilityLabel="Mis categorías"
          style={({ pressed }) => [styles.filaAjuste, pressed ? styles.filaAjustePresionada : null]}
        >
          <View style={styles.iconoAjusteCirculo}>
            <MaterialCommunityIcons name="tag-multiple-outline" size={20} color={colors.text} />
          </View>
          <View style={styles.columnaAjuste}>
            <Text style={styles.etiquetaAjuste}>Mis categorías</Text>
            <Text style={styles.subtextoAjuste} numberOfLines={1}>
              Elegir predefinidas, crear o editar las tuyas
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
        </Pressable>

        {/* Notificaciones */}
        <Pressable
          onPress={abrirAjustesNotificaciones}
          accessibilityRole="button"
          accessibilityLabel={`Notificaciones: ${infoNotif.etiqueta}. Toca para abrir los ajustes de Billo`}
          style={({ pressed }) => [styles.filaAjuste, pressed ? styles.filaAjustePresionada : null]}
        >
          <View style={styles.iconoAjusteCirculo}>
            <MaterialCommunityIcons
              name={infoNotif.activadas ? 'bell-ring-outline' : 'bell-off-outline'}
              size={20}
              color={colors.text}
            />
          </View>
          <View style={styles.columnaAjuste}>
            <Text style={styles.etiquetaAjuste}>Notificaciones</Text>
            <Text style={styles.subtextoAjuste}>{infoNotif.etiqueta} · Abrir ajustes de Billo</Text>
          </View>
          <View
            style={[
              styles.pastillaEstado,
              infoNotif.activadas ? styles.pastillaActiva : styles.pastillaInactiva,
            ]}
          >
            <Text
              style={[
                styles.textoPastillaEstado,
                infoNotif.activadas ? styles.textoPastillaActiva : styles.textoPastillaInactiva,
              ]}
            >
              {infoNotif.etiqueta}
            </Text>
            <MaterialCommunityIcons
              name="open-in-new"
              size={14}
              color={infoNotif.activadas ? colors.exitoTexto : colors.textSecondary}
            />
          </View>
        </Pressable>

        {/* Acerca de Billo */}
        <Pressable
          onPress={() => setPanel('acerca')}
          accessibilityRole="button"
          accessibilityLabel="Acerca de Billo"
          style={({ pressed }) => [styles.filaAjuste, pressed ? styles.filaAjustePresionada : null]}
        >
          <View style={styles.iconoAjusteCirculo}>
            <MaterialCommunityIcons name="information-outline" size={20} color={colors.text} />
          </View>
          <View style={styles.columnaAjuste}>
            <Text style={styles.etiquetaAjuste}>Acerca de Billo</Text>
            <Text style={styles.subtextoAjuste} numberOfLines={1}>
              {infoAcercaDe.equipoNombre} · v{infoAcercaDe.version}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
        </Pressable>

        {/* Acciones de cuenta y administración */}
        <Text style={styles.tituloSeccion}>Cuenta</Text>

        {enModoVisitante ? (
          <View style={styles.bloqueAjuste}>
            <Text style={styles.subtextoAjuste}>{mensajeError(MODO_VISITANTE)}</Text>
          </View>
        ) : (
          <>
            {/* Editar nombre */}
            <Pressable
              onPress={abrirEditarNombre}
              accessibilityRole="button"
              accessibilityLabel="Editar nombre"
              style={({ pressed }) => [
                styles.filaAjuste,
                pressed ? styles.filaAjustePresionada : null,
              ]}
            >
              <View style={styles.iconoAjusteCirculo}>
                <MaterialCommunityIcons name="account-edit-outline" size={20} color={colors.text} />
              </View>
              <View style={styles.columnaAjuste}>
                <Text style={styles.etiquetaAjuste}>Editar nombre</Text>
                <Text style={styles.subtextoAjuste} numberOfLines={1}>
                  {usuario?.nombre || 'Actualiza cómo te llamamos en Billo'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>

            {/* Cambiar contraseña */}
            <Pressable
              onPress={abrirCambiarPassword}
              accessibilityRole="button"
              accessibilityLabel="Cambiar contraseña"
              style={({ pressed }) => [
                styles.filaAjuste,
                pressed ? styles.filaAjustePresionada : null,
              ]}
            >
              <View style={styles.iconoAjusteCirculo}>
                <MaterialCommunityIcons name="lock-reset" size={20} color={colors.text} />
              </View>
              <View style={styles.columnaAjuste}>
                <Text style={styles.etiquetaAjuste}>Cambiar contraseña</Text>
                <Text style={styles.subtextoAjuste} numberOfLines={1}>
                  Actualiza tu contraseña de acceso
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>

            {/* Exportar mis datos */}
            <Pressable
              onPress={handleExportarDatos}
              disabled={exportando}
              accessibilityRole="button"
              accessibilityLabel="Exportar mis datos"
              style={({ pressed }) => [
                styles.filaAjuste,
                pressed ? styles.filaAjustePresionada : null,
              ]}
            >
              <View style={styles.iconoAjusteCirculo}>
                <MaterialCommunityIcons
                  name="file-delimited-outline"
                  size={20}
                  color={colors.text}
                />
              </View>
              <View style={styles.columnaAjuste}>
                <Text style={styles.etiquetaAjuste}>Exportar mis datos</Text>
                <Text style={styles.subtextoAjuste} numberOfLines={1}>
                  {exportando
                    ? 'Preparando archivo CSV…'
                    : 'Descarga tus movimientos en CSV y compártelos'}
                </Text>
              </View>
              {exportando ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <MaterialCommunityIcons
                  name="share-variant-outline"
                  size={20}
                  color={colors.textSecondary}
                />
              )}
            </Pressable>

            {errorExportar ? (
              <BloqueErrorConReintentar
                error={errorExportar}
                onReintentar={handleExportarDatos}
                cargando={exportando}
              />
            ) : null}
          </>
        )}

        {/* HU-49: opción de administración del catálogo exclusiva para administradores */}
        {esAdministrador ? (
          <View style={styles.bloqueAccion}>
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

        {/* HU-23 (spike): acceso a la pantalla de pruebas, solo en desarrollo. */}
        {__DEV__ ? (
          <View style={styles.bloqueAccion}>
            <Boton
              titulo="Laboratorio (spike)"
              icono="flask-outline"
              onPress={() => navigation.navigate('Laboratorio')}
              secundario
            />
          </View>
        ) : null}

        {!enModoVisitante ? (
          <>
            {/* HU-68: Eliminar mi cuenta con confirmación */}
            <View style={styles.bloqueAccion}>
              <Boton
                titulo="Eliminar mi cuenta"
                icono="account-remove-outline"
                onPress={() => {
                  setErrorApi('');
                  setPassword('');
                  setPanel('eliminar');
                }}
                destructivo
              />
            </View>

            {/* Cerrar sesión siempre al final */}
            <View style={styles.bloqueCerrarSesion}>
              <Boton
                titulo="Cerrar sesión"
                icono="logout"
                onPress={confirmarCerrarSesion}
                secundario
              />
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Panel de Editar nombre */}
      {panel === 'nombre' ? (
        <PanelHoja
          titulo="Editar nombre"
          onCerrar={() => {
            if (!guardandoNombre) {
              setPanel(null);
              setErrorCampoNombre('');
              setErrorNombreApi(null);
            }
          }}
        >
          <Input
            etiqueta="Tu nombre"
            icono="account-outline"
            placeholder="Ej. Fernando Villafuerte"
            value={nuevoNombre}
            onChangeText={(t) => {
              setNuevoNombre(t);
              if (errorCampoNombre) setErrorCampoNombre('');
              if (errorNombreApi) setErrorNombreApi(null);
            }}
            maxLength={MAX_NOMBRE}
            limpiable
            editable={!guardandoNombre}
            error={errorCampoNombre}
            autoCapitalize="words"
          />
          <Text style={styles.contadorTexto}>
            {nuevoNombre.trim().length}/{MAX_NOMBRE} caracteres
          </Text>

          {errorNombreApi ? (
            <BloqueErrorConReintentar
              error={errorNombreApi}
              onReintentar={handleGuardarNombre}
              cargando={guardandoNombre}
            />
          ) : null}

          <View style={styles.accionesConfirmacion}>
            <Boton
              titulo="Guardar nombre"
              icono="check"
              onPress={handleGuardarNombre}
              cargando={guardandoNombre}
              disabled={guardandoNombre}
            />
            <Boton
              titulo="Cancelar"
              onPress={() => {
                setPanel(null);
                setErrorCampoNombre('');
                setErrorNombreApi(null);
              }}
              disabled={guardandoNombre}
              secundario
            />
          </View>
        </PanelHoja>
      ) : null}

      {/* Panel de Cambiar contraseña */}
      {panel === 'password' ? (
        <PanelHoja
          titulo="Cambiar contraseña"
          onCerrar={() => {
            if (!guardandoPassword) {
              setPanel(null);
              setErroresPassword({});
              setErrorPasswordApi(null);
            }
          }}
        >
          <Input
            etiqueta="Contraseña actual"
            icono="lock-outline"
            password
            placeholder="Ingresa tu contraseña actual"
            value={passwordActual}
            onChangeText={(t) => {
              setPasswordActual(t);
              if (erroresPassword.actual) {
                setErroresPassword((prev) => ({ ...prev, actual: undefined }));
              }
              if (errorPasswordApi) setErrorPasswordApi(null);
            }}
            editable={!guardandoPassword}
            error={erroresPassword.actual}
            autoCapitalize="none"
          />

          <Input
            etiqueta="Nueva contraseña"
            icono="lock-reset"
            password
            placeholder="Al menos 8 caracteres"
            value={passwordNueva}
            onChangeText={(t) => {
              setPasswordNueva(t);
              if (erroresPassword.nueva) {
                setErroresPassword((prev) => ({ ...prev, nueva: undefined }));
              }
              if (errorPasswordApi) setErrorPasswordApi(null);
            }}
            editable={!guardandoPassword}
            error={erroresPassword.nueva}
            pie={<FuerzaPassword password={passwordNueva} />}
            autoCapitalize="none"
          />

          <Input
            etiqueta="Confirmar nueva contraseña"
            icono="lock-check-outline"
            password
            placeholder="Repite la nueva contraseña"
            value={passwordConfirmar}
            onChangeText={(t) => {
              setPasswordConfirmar(t);
              if (erroresPassword.confirmacion) {
                setErroresPassword((prev) => ({ ...prev, confirmacion: undefined }));
              }
              if (errorPasswordApi) setErrorPasswordApi(null);
            }}
            editable={!guardandoPassword}
            error={erroresPassword.confirmacion}
            autoCapitalize="none"
          />

          {errorPasswordApi ? (
            <BloqueErrorConReintentar
              error={errorPasswordApi}
              onReintentar={handleCambiarPassword}
              cargando={guardandoPassword}
            />
          ) : null}

          <View style={styles.accionesConfirmacion}>
            <Boton
              titulo="Actualizar contraseña"
              icono="check"
              onPress={handleCambiarPassword}
              cargando={guardandoPassword}
              disabled={guardandoPassword}
            />
            <Boton
              titulo="Cancelar"
              onPress={() => {
                setPanel(null);
                setErroresPassword({});
                setErrorPasswordApi(null);
              }}
              disabled={guardandoPassword}
              secundario
            />
          </View>
        </PanelHoja>
      ) : null}

      {/* Panel de selección de Moneda preferida */}
      {panel === 'moneda' ? (
        <PanelHoja titulo="Moneda preferida" onCerrar={() => setPanel(null)}>
          {MONEDAS_DISPONIBLES.map((m) => {
            const seleccionada = m.codigo === infoMoneda.codigo;
            return (
              <Pressable
                key={m.codigo}
                onPress={() => {
                  cambiarMonedaPreferida(m.codigo);
                  setPanel(null);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: seleccionada }}
                style={({ pressed }) => [
                  styles.opcionMoneda,
                  pressed ? styles.opcionMonedaPresionada : null,
                ]}
              >
                <View style={styles.simboloMonedaContenedor}>
                  <Text style={styles.simboloMonedaTexto}>{m.simbolo}</Text>
                </View>
                <View style={styles.monedaInfoColumna}>
                  <Text style={styles.opcionTexto}>{m.codigo}</Text>
                  <Text style={styles.nombreMonedaSubtexto}>{m.nombre}</Text>
                </View>
                {seleccionada ? (
                  <MaterialCommunityIcons name="check" size={22} color={colors.text} />
                ) : null}
              </Pressable>
            );
          })}
        </PanelHoja>
      ) : null}

      {/* Panel Acerca de Billo */}
      {panel === 'acerca' ? (
        <PanelHoja titulo="Acerca de Billo" onCerrar={() => setPanel(null)}>
          <View style={styles.acercaCabecera}>
            <Text style={styles.acercaNombre}>{infoAcercaDe.nombre}</Text>
            <View style={styles.insigniaVersion}>
              <Text style={styles.textoVersion}>Versión {infoAcercaDe.version}</Text>
            </View>
          </View>
          <Text style={styles.acercaDescripcion}>{infoAcercaDe.descripcion}</Text>

          <Text style={styles.acercaSubtitulo}>Equipo · {infoAcercaDe.equipoNombre}</Text>
          <View style={styles.listaEquipo}>
            {infoAcercaDe.integrantes.map((integrante) => (
              <View key={integrante.nombre} style={styles.filaIntegrante}>
                <Text style={styles.nombreIntegrante}>{integrante.nombre}</Text>
                <Text style={styles.rolIntegrante}>{integrante.rol}</Text>
              </View>
            ))}
          </View>

          <View style={styles.accionesAcerca}>
            <Boton
              titulo="Centro de ayuda y proyecto"
              icono="open-in-new"
              onPress={abrirEnlaceAyuda}
              secundario
              compacto
            />
            <Boton titulo="Cerrar" onPress={() => setPanel(null)} compacto />
          </View>
        </PanelHoja>
      ) : null}

      {/* Panel de confirmación de Eliminar cuenta (HU-68) */}
      {panel === 'eliminar' ? (
        <PanelHoja
          titulo="Eliminar cuenta"
          onCerrar={() => {
            if (!eliminando) {
              setPanel(null);
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
                setPanel(null);
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

function BloqueErrorConReintentar({ error, onReintentar, cargando }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const { titulo, mensaje } = textosError(error);
  return (
    <View style={styles.bloqueError} accessibilityLiveRegion="polite">
      <View style={styles.bloqueErrorFila}>
        <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.alertaTexto} />
        <View style={styles.bloqueErrorTextos}>
          <Text style={styles.bloqueErrorTitulo}>{titulo}</Text>
          {mensaje ? <Text style={styles.bloqueErrorMensaje}>{mensaje}</Text> : null}
        </View>
      </View>
      <Boton
        titulo="Reintentar"
        icono="refresh"
        onPress={onReintentar}
        cargando={cargando}
        disabled={cargando}
        secundario
        compacto
      />
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    scrollContenido: {
      paddingTop: 10,
      paddingBottom: 8,
    },
    tarjetaUsuario: {
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: radios.tarjeta,
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    filaNombre: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    nombre: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 20,
      lineHeight: 26,
      letterSpacing: -0.3,
      color: colors.text,
      flexShrink: 1,
    },
    botonEditarNombre: {
      width: 28,
      height: 28,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    correo: {
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      marginTop: 2,
    },
    filaInsignias: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    insigniaVersion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textoVersion: {
      fontFamily: fonts.monoMedium,
      fontSize: 12,
      color: colors.textSecondary,
    },
    insigniaAdmin: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radios.full,
      backgroundColor: colors.acentoSuave,
    },
    textoInsigniaAdmin: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.acentoTexto,
    },
    bannerExito: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radios.xl,
      backgroundColor: colors.exitoSuave,
      marginBottom: 12,
    },
    bannerExitoTexto: {
      flex: 1,
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      lineHeight: 18,
      color: colors.exitoTexto,
    },
    tituloSeccion: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.textMuted,
      marginBottom: 8,
      marginTop: 4,
      paddingHorizontal: 4,
    },
    bloqueAjuste: {
      padding: 14,
      borderRadius: radios['2xl'],
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
      gap: 10,
    },
    cabeceraAjuste: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    selectorTema: {
      flexDirection: 'row',
      gap: 8,
    },
    opcionTema: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: radios.xl,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.border,
    },
    opcionTemaActiva: {
      backgroundColor: colors.acentoSuave,
      borderColor: colors.acento,
    },
    opcionTemaPresionada: {
      backgroundColor: colors.surfaceHigh,
    },
    textoTema: {
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      color: colors.textSecondary,
    },
    textoTemaActivo: {
      fontFamily: fonts.sansSemiBold,
      color: colors.acentoTexto,
    },
    filaAjuste: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: radios['2xl'],
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    filaAjustePresionada: {
      backgroundColor: colors.surfaceHigh,
    },
    iconoAjusteCirculo: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    columnaAjuste: {
      flex: 1,
      gap: 2,
    },
    etiquetaAjuste: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    subtextoAjuste: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    pastillaValor: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHigh,
    },
    textoPastillaValor: {
      fontFamily: fonts.monoMedium,
      fontSize: 13,
      color: colors.text,
    },
    pastillaEstado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radios.full,
    },
    pastillaActiva: {
      backgroundColor: colors.exitoSuave,
    },
    pastillaInactiva: {
      backgroundColor: colors.surfaceHigh,
    },
    textoPastillaEstado: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
    },
    textoPastillaActiva: {
      color: colors.exitoTexto,
    },
    textoPastillaInactiva: {
      color: colors.textSecondary,
    },
    bloqueAccion: {
      marginBottom: 10,
    },
    bloqueCerrarSesion: {
      marginTop: 2,
    },
    contadorTexto: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
      textAlign: 'right',
      marginTop: -8,
      marginBottom: 12,
    },
    bloqueError: {
      padding: 12,
      borderRadius: radios.xl,
      backgroundColor: colors.alertaSuave,
      gap: 10,
      marginBottom: 12,
    },
    bloqueErrorFila: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    bloqueErrorTextos: {
      flex: 1,
      gap: 2,
    },
    bloqueErrorTitulo: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.alertaTexto,
    },
    bloqueErrorMensaje: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    opcionMoneda: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    opcionMonedaPresionada: {
      backgroundColor: colors.border,
    },
    simboloMonedaContenedor: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceLow,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    simboloMonedaTexto: {
      fontFamily: fonts.monoMedium,
      fontSize: 14,
      color: colors.text,
    },
    monedaInfoColumna: {
      flex: 1,
      gap: 2,
    },
    opcionTexto: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
      fontSize: 15,
      lineHeight: 20,
    },
    nombreMonedaSubtexto: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    acercaCabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    acercaNombre: {
      fontFamily: fonts.sansBold,
      fontSize: 20,
      color: colors.text,
    },
    acercaDescripcion: {
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      marginBottom: 14,
    },
    acercaSubtitulo: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      color: colors.text,
      marginBottom: 8,
    },
    listaEquipo: {
      gap: 6,
      padding: 12,
      borderRadius: radios.xl,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    filaIntegrante: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    nombreIntegrante: {
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      color: colors.text,
      flex: 1,
    },
    rolIntegrante: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    accionesAcerca: {
      gap: 8,
    },
    textoAdvertencia: {
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    accionesConfirmacion: {
      gap: 8,
    },
  });
