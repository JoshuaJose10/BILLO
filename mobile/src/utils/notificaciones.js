// Decisiones del registro de notificaciones push (HU-47, RF7). Sin dependencias de Expo para
// probarlas con npm test; services/notificaciones.js las conecta con expo-notifications.

// Mismo formato que valida el backend (POST /notificaciones/token): un token distinto ni se envía.
const REGEX_TOKEN_EXPO = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

export function esTokenPushValido(token) {
  return typeof token === 'string' && token.length <= 255 && REGEX_TOKEN_EXPO.test(token);
}

// Se registra una vez por sesión: al iniciar sesión, al restaurarla al abrir la app y al entrar
// con otro usuario (cambia el token de sesión). Sin sesión no hay nada que registrar.
export function debeRegistrar(sesion, ultimaSesionRegistrada) {
  return Boolean(sesion) && sesion !== ultimaSesionRegistrada;
}

// Obtiene el token push y lo manda al backend. Nunca lanza: sin permiso, sin soporte o con error
// del servidor la app sigue igual. `avisar` recibe el error (solo para desarrollo).
// Devuelve el token registrado o null.
export async function registrarNotificaciones({ obtenerToken, registrar, avisar = () => {} }) {
  let token;
  try {
    token = await obtenerToken();
  } catch (error) {
    avisar(error);
    return null;
  }
  if (!esTokenPushValido(token)) return null;

  try {
    await registrar(token);
    return token;
  } catch (error) {
    avisar(error);
    return null;
  }
}

// Parámetros de Cartera al tocar una notificación. Hoy el backend solo manda avisos de cobro; un
// `data.tipo` distinto de 'cobro' no navega. Sin datos se asume cobro.
export function destinoNotificacion(data) {
  if (data?.tipo && data.tipo !== 'cobro') return null;
  return { seccion: 'suscripciones' };
}
