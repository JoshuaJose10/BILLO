import { API_URL, TIMEOUT_MS } from '../config/api';

export const SIN_CONEXION = 'SIN_CONEXION';
const MENSAJE_SIN_CONEXION = 'No se pudo conectar con el servidor';

// Se registra desde AuthContext: cualquier 401 en una ruta con token cierra la sesión.
let alNoAutorizado = null;

export function setAlNoAutorizado(fn) {
  alNoAutorizado = fn;
}

// El contrato define { error: { codigo, mensaje } }, pero el backend actual responde
// { error: { code, message } } y en algunos 500 { error: 'texto' }. Aceptamos todos.
function normalizarError(status, body) {
  const error = body?.error;
  if (error && typeof error === 'object') {
    return {
      codigo: error.codigo || error.code || `HTTP_${status}`,
      mensaje: error.mensaje || error.message || 'Ocurrió un error inesperado',
      status,
    };
  }
  return {
    codigo: status >= 500 ? 'ERROR_INTERNO' : `HTTP_${status}`,
    mensaje: typeof error === 'string' ? error : 'Ocurrió un error inesperado',
    status,
  };
}

// fetch con timeout y errores normalizados. Lanza siempre { codigo, mensaje, status }.
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
    throw { codigo: SIN_CONEXION, mensaje: MENSAJE_SIN_CONEXION, status: 0 };
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
      alNoAutorizado();
    }
    throw normalizarError(respuesta.status, datos);
  }

  return datos;
}
