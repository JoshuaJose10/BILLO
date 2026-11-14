import { API_URL, ERROR_API_URL, TIMEOUT_MS } from '../config/api.js';

// Códigos que genera la app (no vienen del servidor).
export const SIN_CONEXION = 'SIN_CONEXION';
export const ERROR_DESCONOCIDO = 'ERROR_DESCONOCIDO';
// Petición rechazada porque la app está en modo exploración (HU-50): nunca llega a la red.
export const MODO_VISITANTE = 'MODO_VISITANTE';

// Lo activa AuthContext al entrar al modo exploración y lo apaga al salir. Mientras está activo
// apiFetch no hace ninguna petición; los datos de ejemplo salen de src/datos/ejemplo.js.
let modoVisitante = false;

export function setModoVisitante(activo) {
  modoVisitante = activo;
}

// Se registra desde AuthContext: cualquier 401 en una ruta con token cierra la sesión.
// Recibe el token con el que se hizo la petición.
let alNoAutorizado = null;

export function setAlNoAutorizado(fn) {
  alNoAutorizado = fn;
}

// Contrato v1.1: { error: { code, message } }. Si la respuesta no trae ese formato
// (HTML de Express, 500 con texto, sin cuerpo) se reporta como ERROR_DESCONOCIDO.
// Un 5xx genérico (ERROR_SERVIDOR o sin código: proxy o servidor caído) se reporta como
// SIN_CONEXION para mostrar el mismo error con Reintentar (HU-69); un 5xx con código propio
// (p. ej. 502 FUENTE_NO_DISPONIBLE) conserva su código.
function normalizarError(status, body) {
  const error = body?.error;
  const code =
    error && typeof error === 'object' && typeof error.code === 'string' ? error.code : null;
  if (status >= 500 && (!code || code === 'ERROR_SERVIDOR')) {
    return { code: SIN_CONEXION, message: '', status };
  }
  if (code) return { code, message: error.message || '', status };
  return { code: ERROR_DESCONOCIDO, message: '', status };
}

// fetch con timeout y errores normalizados. Lanza siempre { code, message, status }.
// Con `token` se envía el encabezado Authorization y un 401 dispara el cierre de sesión.
// Con `signal` quien llama puede cancelar la petición (HU-47); igual que el timeout (TIMEOUT_MS),
// se reporta como SIN_CONEXION.
export async function apiFetch(ruta, { method = 'GET', body, token, signal } = {}) {
  // Guardia del modo exploración: ni el token push ni ninguna otra ruta sale a la red.
  if (modoVisitante) {
    throw { code: MODO_VISITANTE, message: '', status: 0 };
  }

  // Sin EXPO_PUBLIC_API_URL válida no se intenta la petición (HU-80).
  if (ERROR_API_URL) {
    throw { code: ERROR_API_URL, message: '', status: 0 };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const cancelar = () => controller.abort();
  if (signal?.aborted) cancelar();
  signal?.addEventListener('abort', cancelar);

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    // Timeout (abort), sin red o servidor apagado.
    throw { code: SIN_CONEXION, message: '', status: 0 };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancelar);
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    // Respuesta sin cuerpo JSON.
  }

  if (!respuesta.ok) {
    if (
      respuesta.status === 401 &&
      token &&
      alNoAutorizado &&
      datos?.error?.code !== 'PASSWORD_INCORRECTA'
    ) {
      alNoAutorizado(token);
    }
    throw normalizarError(respuesta.status, datos);
  }

  return datos;
}
