// Valida EXPO_PUBLIC_API_URL (HU-80). Sin imports para poder probarla con node --test.
// Devuelve { url, error }:
// - url: la dirección sin diagonal final ('' si no sirve), lista para `${url}/ruta`.
// - error: null | 'API_URL_FALTANTE' (no está definida) | 'API_URL_INVALIDA' (no es http(s)://…).
export function validarApiUrl(valor) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) return { url: '', error: 'API_URL_FALTANTE' };
  if (!/^https?:\/\/[^\s/]+/i.test(texto)) return { url: '', error: 'API_URL_INVALIDA' };
  return { url: texto.replace(/\/+$/, ''), error: null };
}
