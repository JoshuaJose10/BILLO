import { MIN_PASSWORD } from './validacion.js';

// Recuperar contraseña (HU-65): el código del correo es de 6 dígitos.
export const LARGO_CODIGO = 6;
// Espera antes de «Reenviar código»; el backend acepta 3 solicitudes por correo cada 15 min.
export const ESPERA_REENVIO_MS = 60 * 1000;

// Deja solo dígitos (al pegar «482 910» o «Código: 482910») y corta a 6.
export const limpiarCodigo = (texto) => (texto ?? '').replace(/\D/g, '').slice(0, LARGO_CODIGO);

export const esCodigoValido = (codigo) => /^\d{6}$/.test(codigo ?? '');

// Campo y mensaje de los errores de POST /auth/restablecer-contrasena que van junto a un campo.
// null = error general (se muestra con mensajeError). TOKEN_INVALIDO aquí es el código del correo,
// no la sesión, por eso no está en utils/errores.
export function errorRestablecer(code) {
  if (code === 'TOKEN_INVALIDO') {
    return { campo: 'codigo', mensaje: 'El código no es válido o ya venció' };
  }
  if (code === 'PASSWORD_MUY_CORTA') {
    return {
      campo: 'password',
      mensaje: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`,
    };
  }
  return null;
}

// Segundos completos que faltan para `hastaMs` (0 si ya pasó). Redondea hacia arriba para que la
// cuenta muestre 1 hasta el último instante.
export const segundosRestantes = (hastaMs, ahoraMs) =>
  Math.max(0, Math.ceil((hastaMs - ahoraMs) / 1000));

// 60 → "1:00", 5 → "0:05".
export const formatoCuenta = (segundos) =>
  `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
