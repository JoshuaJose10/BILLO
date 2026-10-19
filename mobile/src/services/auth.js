import { apiFetch } from './api';

// El backend de login normaliza el correo a minúsculas pero el de registro no,
// así que lo normalizamos aquí para que ambos coincidan.
const normalizarEmail = (email) => email.trim().toLowerCase();

// POST /auth/register → 201 { id, nombre, email } (el contrato dice { usuario }; aceptamos ambos).
// Errores: 400 EMAIL_INVALIDO / PASSWORD_MUY_CORTA / NOMBRE_REQUERIDO, 409 EMAIL_DUPLICADO.
export async function registrar(nombre, email, password) {
  const datos = await apiFetch('/auth/register', {
    method: 'POST',
    body: { nombre: nombre.trim(), email: normalizarEmail(email), password },
  });
  return { token: datos?.token ?? null, usuario: datos?.usuario ?? datos };
}

// POST /auth/login → 200 { token, usuario }. Error: 401 CREDENCIALES_INVALIDAS.
export async function login(email, password) {
  const datos = await apiFetch('/auth/login', {
    method: 'POST',
    body: { email: normalizarEmail(email), password },
  });
  return { token: datos.token, usuario: datos.usuario };
}
