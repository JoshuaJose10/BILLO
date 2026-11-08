import { validarApiUrl } from '../utils/apiUrl.js';

// Expo solo expone al bundle las variables que empiezan con EXPO_PUBLIC_, y las copia (inline) al
// generar el bundle: en Expo Go salen de mobile/.env al correr `npx expo start`; en un APK de EAS,
// de las variables del perfil de build (mobile/.env está en .gitignore y no se sube). Si cambias el
// .env reinicia con `npx expo start -c`.
const { url, error } = validarApiUrl(process.env.EXPO_PUBLIC_API_URL);

// Sin la diagonal final para poder concatenar rutas como `${API_URL}/auth/login`.
export const API_URL = url;

// null | 'API_URL_FALTANTE' | 'API_URL_INVALIDA'. Con error, apiFetch falla con ese código en vez
// de pedir una ruta relativa que nunca responde (antes se veían listas vacías sin aviso; HU-80).
export const ERROR_API_URL = error;

if (error) {
  console.error(
    error === 'API_URL_FALTANTE'
      ? 'EXPO_PUBLIC_API_URL no está definida. Copia mobile/.env.example como mobile/.env con la IPv4 de tu PC y reinicia con `npx expo start -c`.'
      : `EXPO_PUBLIC_API_URL no es válida ("${process.env.EXPO_PUBLIC_API_URL}"). Debe ser como http://192.168.1.100:3000.`,
  );
}

export const TIMEOUT_MS = 10000;
