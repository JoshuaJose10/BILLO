import { API_URL, TIMEOUT_MS } from '../config/api';

// Códigos que genera la app (no vienen del servidor).
export const SIN_CONEXION = 'SIN_CONEXION';
export const ERROR_DESCONOCIDO = 'ERROR_DESCONOCIDO';

// Se registra desde AuthContext: cualquier 401 en una ruta con token cierra la sesión.
// Recibe el token con el que se hizo la petición.
let alNoAutorizado = null;

export function setAlNoAutorizado(fn) {
  alNoAutorizado = fn;
}

// Contrato v1.1: { error: { code, message } }. Si la respuesta no trae ese formato
// (HTML de Express, 500 con texto, sin cuerpo) se reporta como ERROR_DESCONOCIDO.
function normalizarError(status, body) {
  const error = body?.error;
  if (error && typeof error === 'object' && typeof error.code === 'string') {
    return { code: error.code, message: error.message || '', status };
  }
  return { code: ERROR_DESCONOCIDO, message: '', status };
}

// fetch con timeout y errores normalizados. Lanza siempre { code, message, status }.
// Con `token` se envía el encabezado Authorization y un 401 dispara el cierre de sesión.
export async function apiFetch(ruta, { method = 'GET', body, token } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
  }

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    // Respuesta sin cuerpo JSON.
  }

  if (!respuesta.ok) {
    if (respuesta.status === 401 && token && alNoAutorizado) {
      alNoAutorizado(token);
    }
    throw normalizarError(respuesta.status, datos);
  }

  return datos;
}
