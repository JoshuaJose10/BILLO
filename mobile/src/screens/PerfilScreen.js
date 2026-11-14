import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import appConfig from '../../app.json';
import Avatar from '../components/Avatar';
import Boton from '../components/Boton';
import HojaInferior from '../components/HojaInferior';
import Input from '../components/Input';
import PanelHoja from '../components/PanelHoja';
import { useApi, useAuth } from '../context/AuthContext';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { esAdmin } from '../utils/auth';
import { MONEDAS_DISPONIBLES } from '../utils/divisas';
import { mensajeError } from '../utils/errores';
import {
  descripcionMonedaPreferida,
  estadoNotificaciones,
  MODOS_TEMA,
  obtenerInfoAcercaDe,
} from '../utils/preferencias';

// Hoja inferior de Perfil (ruta Perfil con presentation: 'transparentModal'), se abre
// desde el avatar de Inicio. Permite ajustar tema, moneda preferida, notificaciones,
// consultar Acerca de Billo, administrar catálogo (admin), eliminar cuenta y cerrar sesión (HU-87).
export default function PerfilScreen({ navigation }) {
  const { usuario, token, cerrarSesion } = useAuth();
  const api = useApi();
  const { colors, modoTema, cambiarModoTema, monedaPreferida, cambiarMonedaPreferida } = useTema();
  const styles = useEstilos(crearEstilos);
  const esAdministrador = esAdmin(token);

  const versionApp = Constants.expoConfig?.version || appConfig?.expo?.version || '1.0.0';
  const infoAcercaDe = obtenerInfoAcercaDe(versionApp);
  const infoMoneda = descripcionMonedaPreferida(monedaPreferida);

  // Panel flotante activo: null | 'moneda' | 'acerca' | 'eliminar'
  const [panel, setPanel] = useState(null);
  const [permisoNotif, setPermisoNotif] = useState(null);
  const [password, setPassword] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [errorApi, setErrorApi] = useState('');

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
      bloqueada={eliminando}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContenido}
      >
        {/* Tarjeta de datos del usuario y versión de la app */}
        <View style={styles.tarjetaUsuario}>
          <Avatar nombre={usuario?.nombre} tamano={72} />
          <Text style={styles.nombre} numberOfLines={1}>
            {usuario?.nombre || 'Sin nombre'}
          </Text>
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
          <Boton titulo="Cerrar sesión" icono="logout" onPress={confirmarCerrarSesion} secundario />
        </View>
      </ScrollView>

      {/* Panel de selección de Moneda preferida */}
      {panel === 'moneda' ? (
        <PanelHoja titulo="Moneda preferida" onCerrar={() => setPanel(null)}>
          <ScrollView style={styles.listaMonedas} showsVerticalScrollIndicator={false}>
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
          </ScrollView>
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
      marginBottom: 18,
    },
    nombre: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 20,
      lineHeight: 26,
      letterSpacing: -0.3,
      color: colors.text,
      marginTop: 10,
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
    listaMonedas: {
      maxHeight: 340,
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
    },
    simboloMonedaTexto: {
      fontFamily: fonts.monoMedium,
      fontSize: 14,
      color: colors.text,
    },
    monedaInfoColumna: {
      flex: 1,
    },
    opcionTexto: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
      fontSize: 15,
    },
    nombreMonedaSubtexto: {
      fontFamily: fonts.sans,
      fontSize: 12,
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
      marginTop: 16,
      gap: 10,
    },
  });
