// Expo solo expone al bundle las variables que empiezan con EXPO_PUBLIC_.
// Se definen en mobile/.env (ver .env.example). Si cambias el .env reinicia con `npx expo start -c`.
const url = process.env.EXPO_PUBLIC_API_URL;

if (!url) {
  console.warn('EXPO_PUBLIC_API_URL no está definida. Revisa mobile/.env');
}

// Sin la diagonal final para poder concatenar rutas como `${API_URL}/auth/login`.
export const API_URL = (url || '').replace(/\/+$/, '');

export const TIMEOUT_MS = 10000;
