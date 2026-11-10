import { CommonActions } from '@react-navigation/native';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { navegacionRef } from '../navigation/navegacionRef';
import {
  debeRegistrar,
  describirFallo,
  destinoNotificacion,
  registrarNotificaciones,
} from '../utils/notificaciones';
import { apiFetch } from './api';

// Notificaciones push de cobro (HU-47, RF7). Todo es silencioso para el usuario: sin permiso, en
// Expo Go, en simulador o con error del backend la app funciona igual y no muestra alertas.

// Mismo id que `defaultChannel` del plugin en app.json.
const CANAL = 'default';

function avisarEnDesarrollo(etapa, error) {
  if (__DEV__) console.warn(describirFallo(etapa, error));
}

// Se llama una vez al arrancar (index.js): con la app abierta el aviso también se muestra.
export function configurarNotificaciones() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    avisarEnDesarrollo('configuracion', error);
  }
}

// POST /notificaciones/token { expo_push_token } → 200 { registrado: true }
// Errores del contrato v1.1 ({ code, message, status }): 400 TOKEN_PUSH_INVALIDO, 401, sin conexión.
export function registrarTokenPush(expoPushToken, sesion) {
  return apiFetch('/notificaciones/token', {
    method: 'POST',
    body: { expo_push_token: expoPushToken },
    token: sesion,
  });
}

// Token de Expo del teléfono o null si no se puede (nunca lanza).
export async function obtenerTokenPush() {
  try {
    // Simulador, emulador y web no reciben push. Expo Go en Android ya no las soporta (SDK 53+).
    if (!Device.isDevice || Platform.OS === 'web') return null;
    if (Platform.OS === 'android' && isRunningInExpoGo()) return null;

    // Android 13+ no muestra el diálogo de permiso si no existe un canal.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL, {
        name: 'Avisos de cobro',
        importance: AndroidImportance.HIGH,
      });
    }

    // Se pide solo si falta y el sistema todavía deja preguntar: si lo negó, no se insiste.
    let permiso = await Notifications.getPermissionsAsync();
    if (permiso.status !== 'granted' && permiso.canAskAgain) {
      permiso = await Notifications.requestPermissionsAsync();
    }
    if (permiso.status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (error) {
    // Sin FCM (falta google-services.json), sin red o módulo no disponible.
    avisarEnDesarrollo('token', error);
    return null;
  }
}

// Registra el token push una vez por sesión (al iniciarla o restaurarla) y otra vez si entra otro
// usuario. Corre en segundo plano: no bloquea la UI ni el login.
export function useRegistroNotificaciones() {
  const { token } = useAuth();
  const ultimaSesion = useRef(null);

  useEffect(() => {
    if (!debeRegistrar(token, ultimaSesion.current)) return;
    ultimaSesion.current = token;
    registrarNotificaciones({
      obtenerToken: obtenerTokenPush,
      registrar: (expoPushToken) => registrarTokenPush(expoPushToken, token),
      avisar: avisarEnDesarrollo,
    });
  }, [token]);
}

// Al tocar un aviso de cobro (con la app abierta, en segundo plano o cerrada) abre Cartera en
// Suscripciones. Si no hay sesión espera a que el usuario entre.
export function useAperturaDesdeNotificacion() {
  const { token, cargando } = useAuth();
  const respuesta = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!respuesta || !token || cargando || !navegacionRef.isReady()) return;
    if (respuesta.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const destino = destinoNotificacion(respuesta.notification.request.content.data);
    // Se limpia para no volver a navegar con el mismo toque.
    Notifications.clearLastNotificationResponse();
    if (!destino) return;

    // Igual que el aviso de presupuesto: `pop` cierra hojas abiertas y `solicitud` hace que
    // Cartera aplique la sección aunque ya estuviera abierta.
    navegacionRef.dispatch(
      CommonActions.navigate({
        name: 'Main',
        params: { screen: 'Cartera', params: { ...destino, solicitud: Date.now() } },
        pop: true,
      }),
    );
  }, [respuesta, token, cargando]);
}
