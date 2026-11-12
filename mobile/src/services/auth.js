import { apiFetch } from './api.js';

// El backend de login normaliza el correo a minúsculas pero el de registro no,
// así que lo normalizamos aquí para que ambos coincidan.
const normalizarEmail = (email) => email.trim().toLowerCase();

// POST /auth/register → 201 { usuario, token } según el contrato v1.1.
// Hasta HU-18 el backend responde { id, nombre, email } sin token: en ese caso `token` es null
// y AuthContext inicia sesión con las mismas credenciales.
// Errores: 400 NOMBRE_REQUERIDO / EMAIL_INVALIDO / PASSWORD_MUY_CORTA, 409 EMAIL_DUPLICADO.
export async function registrar(nombre, email, password) {
  const datos = await apiFetch('/auth/register', {
    method: 'POST',
    body: { nombre: nombre.trim(), email: normalizarEmail(email), password },
  });
  return { token: datos?.token ?? null, usuario: datos?.usuario ?? datos };
}

// POST /auth/login → 200 { usuario, token }.
// Errores: 400 CAMPOS_REQUERIDOS, 401 CREDENCIALES_INVALIDAS.
export async function login(email, password) {
  const datos = await apiFetch('/auth/login', {
    method: 'POST',
    body: { email: normalizarEmail(email), password },
  });
  return { token: datos.token, usuario: datos.usuario };
}

// POST /auth/olvide-contrasena → 200 { enviado, message } siempre, exista o no la cuenta (contrato
// v1.3). El código de 6 dígitos llega por correo y vence a los 30 min.
// Errores: 400 EMAIL_INVALIDO, 429 DEMASIADAS_SOLICITUDES.
export function solicitarCodigo(email) {
  return apiFetch('/auth/olvide-contrasena', {
    method: 'POST',
    body: { email: normalizarEmail(email) },
  });
}

// POST /auth/restablecer-contrasena → 200 { restablecida }. El `token` del contrato es el código
// del correo; el backend también acepta `email` y con él solo busca el código en esa cuenta.
// Errores: 400 TOKEN_INVALIDO (incorrecto, vencido o ya usado), PASSWORD_MUY_CORTA.
export function restablecerPassword(email, codigo, password) {
  return apiFetch('/auth/restablecer-contrasena', {
    method: 'POST',
    body: { email: normalizarEmail(email), token: codigo, password },
  });
}
