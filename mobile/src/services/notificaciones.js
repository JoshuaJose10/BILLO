import { CommonActions } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import { navegacionRef } from '../navigation/navegacionRef';
import { destinoNotificacion } from '../utils/notificaciones';
import { avisarEnDesarrollo, vinculoPush } from './tokenPush';

// Notificaciones push de cobro (HU-47, RF7): hooks de la app. El token y su vínculo con la sesión
// viven en tokenPush.js.

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

// Registra el token push una vez por sesión (al iniciarla o restaurarla) y otra vez si entra otro
// usuario. Corre en segundo plano: no bloquea la UI ni el login. Al cerrar sesión, AuthContext
// desvincula el token y descarta cualquier registro pendiente.
export function useRegistroNotificaciones() {
  const { token } = useAuth();

  useEffect(() => {
    if (token) vinculoPush.iniciar(token);
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
