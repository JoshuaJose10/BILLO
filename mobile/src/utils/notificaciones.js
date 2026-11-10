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
// del servidor la app sigue igual. `avisar(etapa, error)` es solo para desarrollo; la etapa es
// 'token' (obtener el token de Expo) o 'registro' (POST al backend).
// Devuelve el token registrado o null.
export async function registrarNotificaciones({ obtenerToken, registrar, avisar = () => {} }) {
  let token;
  try {
    token = await obtenerToken();
  } catch (error) {
    avisar('token', error);
    return null;
  }
  if (!esTokenPushValido(token)) return null;

  try {
    await registrar(token);
    return token;
  } catch (error) {
    avisar('registro', error);
    return null;
  }
}

// Línea del log de desarrollo: "[notificaciones] <etapa>: <code> <message>". Sirve para errores
// de la API ({ code, message, status }), de Expo (Error con `code`) o cualquier otro valor.
export function describirFallo(etapa, error) {
  const code = error?.code ?? error?.name ?? 'ERROR';
  const message = error?.message || (error?.status ? `HTTP ${error.status}` : String(error ?? ''));
  return `[notificaciones] ${etapa}: ${code} ${message}`.trim();
}

// Parámetros de Cartera al tocar una notificación. Hoy el backend solo manda avisos de cobro; un
// `data.tipo` distinto de 'cobro' no navega. Sin datos se asume cobro.
export function destinoNotificacion(data) {
  if (data?.tipo && data.tipo !== 'cobro') return null;
  return { seccion: 'suscripciones' };
}
