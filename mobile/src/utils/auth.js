/**
 * Utilidades para decodificar información pública del token JWT en el cliente móvil.
 * Sin dependencias externas para compatibilidad con React Native, web y node --test.
 */

// Decodifica la carga útil (payload) de un token JWT en formato Base64Url
export function decodificarPayloadJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;

  try {
    const base64Url = partes[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    let jsonStr = '';
    if (typeof atob === 'function') {
      jsonStr = atob(padded);
    } else if (typeof globalThis !== 'undefined' && globalThis.Buffer) {
      jsonStr = globalThis.Buffer.from(padded, 'base64').toString('utf-8');
    } else {
      return null;
    }

    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

// Devuelve el rol del usuario contenido en el token ('usuario' o 'admin')
export function obtenerRolDesdeToken(token) {
  const payload = decodificarPayloadJwt(token);
  return payload?.rol || 'usuario';
}

// Devuelve true únicamente si el token pertenece a un administrador
export function esAdmin(token) {
  return obtenerRolDesdeToken(token) === 'admin';
}
