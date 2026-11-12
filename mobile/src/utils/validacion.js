// Misma regla que usa el backend en /auth/register.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const esEmailValido = (email) => EMAIL_REGEX.test(email.trim());

export const MIN_PASSWORD = 8;

// Mensajes de los formularios de Login, Registro y Recuperar contraseña (undefined = válido).
export function errorEmail(email) {
  if (!email.trim()) return 'Ingresa tu correo';
  if (!esEmailValido(email)) return 'Ingresa un correo válido';
  return undefined;
}

// Contraseña nueva (Registro y Restablecer): misma regla que el backend.
export function errorPasswordNueva(password) {
  if (!password) return 'Ingresa una contraseña';
  if (password.length < MIN_PASSWORD) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`;
  }
  return undefined;
}

export function errorConfirmacion(password, confirmacion) {
  if (!confirmacion) return 'Confirma tu contraseña';
  if (confirmacion !== password) return 'Las contraseñas no coinciden';
  return undefined;
}

export const hayErrores = (errores) => Object.values(errores).some(Boolean);

// 0 = vacía, 1 = débil, 2 = media, 3 = fuerte. Combina longitud y variedad
// (minúsculas, mayúsculas, números, símbolos).
export function fuerzaPassword(password) {
  if (!password) return 0;
  const variedad = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (password.length >= 12 && variedad >= 3) return 3;
  if (password.length >= MIN_PASSWORD && variedad >= 2) return 2;
  return 1;
}
