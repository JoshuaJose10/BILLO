import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { apiFetch, setAlNoAutorizado } from '../services/api';
import * as authService from '../services/auth';

const CLAVE_TOKEN = 'billo_token';
const CLAVE_USUARIO = 'billo_usuario';

// Motivo de `motivoCierre` cuando la API rechaza el token (401).
export const SESION_VENCIDA = 'SESION_VENCIDA';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  // Por qué se cerró la sesión sin que el usuario lo pidiera (null si no aplica).
  const [motivoCierre, setMotivoCierre] = useState(null);
  const tokenRef = useRef(null);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

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
    setMotivoCierre(null);
    setUsuario(nuevoUsuario ?? null);
    setToken(nuevoToken);
  }, []);

  const terminarSesion = useCallback(async (motivo) => {
    setMotivoCierre(motivo);
    setToken(null);
    setUsuario(null);
    try {
      await SecureStore.deleteItemAsync(CLAVE_TOKEN);
      await SecureStore.deleteItemAsync(CLAVE_USUARIO);
    } catch {
      // El estado en memoria ya quedó limpio.
    }
  }, []);

  // Cierre pedido por el usuario: no deja aviso en Login.
  const cerrarSesion = useCallback(() => terminarSesion(null), [terminarSesion]);

  const limpiarMotivoCierre = useCallback(() => setMotivoCierre(null), []);

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
        // Hasta HU-18 el backend no devuelve token al registrar: iniciamos sesión con las mismas credenciales.
        await iniciarSesion(email, password);
      }
    },
    [guardarSesion, iniciarSesion],
  );

  // Un 401 con el token de la sesión actual la cierra con el aviso de sesión vencida.
  // Si la petición usó un token anterior (el usuario ya salió o volvió a entrar), se ignora.
  useEffect(() => {
    setAlNoAutorizado((tokenUsado) => {
      if (tokenUsado === tokenRef.current) {
        terminarSesion(SESION_VENCIDA);
      }
    });
    return () => setAlNoAutorizado(null);
  }, [terminarSesion]);

  const valor = useMemo(
    () => ({
      token,
      usuario,
      cargando,
      motivoCierre,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      limpiarMotivoCierre,
    }),
    [
      token,
      usuario,
      cargando,
      motivoCierre,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      limpiarMotivoCierre,
    ],
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
