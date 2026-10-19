import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiFetch, setAlNoAutorizado } from '../services/api';
import * as authService from '../services/auth';

const CLAVE_TOKEN = 'billo_token';
const CLAVE_USUARIO = 'billo_usuario';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la app recupera la sesión guardada.
  useEffect(() => {
    (async () => {
      try {
        const [tokenGuardado, usuarioGuardado] = await Promise.all([
          SecureStore.getItemAsync(CLAVE_TOKEN),
          SecureStore.getItemAsync(CLAVE_USUARIO),
        ]);
        if (tokenGuardado) {
          setToken(tokenGuardado);
          setUsuario(usuarioGuardado ? JSON.parse(usuarioGuardado) : null);
        }
      } catch {
        // Si no se puede leer, se arranca sin sesión.
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const guardarSesion = useCallback(async (nuevoToken, nuevoUsuario) => {
    await SecureStore.setItemAsync(CLAVE_TOKEN, nuevoToken);
    await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(nuevoUsuario ?? null));
    setUsuario(nuevoUsuario ?? null);
    setToken(nuevoToken);
  }, []);

  const cerrarSesion = useCallback(async () => {
    setToken(null);
    setUsuario(null);
    try {
      await SecureStore.deleteItemAsync(CLAVE_TOKEN);
      await SecureStore.deleteItemAsync(CLAVE_USUARIO);
    } catch {
      // El estado en memoria ya quedó limpio.
    }
  }, []);

  const iniciarSesion = useCallback(
    async (email, password) => {
      const { token: t, usuario: u } = await authService.login(email, password);
      await guardarSesion(t, u);
    },
    [guardarSesion],
  );

  const registrarse = useCallback(
    async (nombre, email, password) => {
      const { token: t, usuario: u } = await authService.registrar(nombre, email, password);
      if (t) {
        await guardarSesion(t, u);
      } else {
        // El backend actual no devuelve token al registrar: iniciamos sesión con las mismas credenciales.
        await iniciarSesion(email, password);
      }
    },
    [guardarSesion, iniciarSesion],
  );

  // Cualquier 401 en una llamada con token cierra la sesión.
  useEffect(() => {
    setAlNoAutorizado(() => {
      cerrarSesion();
    });
    return () => setAlNoAutorizado(null);
  }, [cerrarSesion]);

  const valor = useMemo(
    () => ({ token, usuario, cargando, iniciarSesion, registrarse, cerrarSesion }),
    [token, usuario, cargando, iniciarSesion, registrarse, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}

// Helper para las llamadas autenticadas de las siguientes HU:
//   const api = useApi();
//   const categorias = await api('/categorias?tipo=gasto');
// Envía el token y, si la API responde 401, cierra la sesión automáticamente.
export function useApi() {
  const { token } = useAuth();
  return useCallback((ruta, opciones = {}) => apiFetch(ruta, { ...opciones, token }), [token]);
}
