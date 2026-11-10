import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { crearVinculoPush, describirFallo } from '../utils/notificaciones';
import { apiFetch } from './api';

// Token push del teléfono y su vínculo con la sesión (HU-47, RF7). Sin dependencias de React ni de
// AuthContext para que AuthContext pueda desvincular el token al cerrar sesión.
// Todo es silencioso para el usuario: sin permiso, en Expo Go, en simulador o con error del
// backend la app funciona igual y no muestra alertas.

// Mismo id que `defaultChannel` del plugin en app.json.
const CANAL = 'default';

export function avisarEnDesarrollo(etapa, error) {
  if (__DEV__) console.warn(describirFallo(etapa, error));
}

// POST /notificaciones/token { expo_push_token } → 200 { registrado: true }
// Errores del contrato v1.1 ({ code, message, status }): 400 TOKEN_PUSH_INVALIDO, 401, sin conexión.
export function registrarTokenPush(expoPushToken, sesion, signal) {
  return apiFetch('/notificaciones/token', {
    method: 'POST',
    body: { expo_push_token: expoPushToken },
    token: sesion,
    signal,
  });
}

// DELETE /notificaciones/token { expo_push_token } → 200 { eliminado: true } (idempotente).
export function eliminarTokenPush(expoPushToken, sesion, signal) {
  return apiFetch('/notificaciones/token', {
    method: 'DELETE',
    body: { expo_push_token: expoPushToken },
    token: sesion,
    signal,
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

// Único vínculo de la app: lo inicia useRegistroNotificaciones y lo cierra AuthContext.
export const vinculoPush = crearVinculoPush({
  obtenerToken: obtenerTokenPush,
  registrar: registrarTokenPush,
  eliminar: eliminarTokenPush,
  avisar: avisarEnDesarrollo,
});
