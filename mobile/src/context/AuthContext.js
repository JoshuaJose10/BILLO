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
import { Platform } from 'react-native';

import { apiFetch, setAlNoAutorizado } from '../services/api';
import * as authService from '../services/auth';
import { vinculoPush } from '../services/tokenPush';
import { limpiarWidget } from '../widget/sincronizar';

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
    let activo = true;
    const timer = setTimeout(() => {
      if (activo) setCargando(false);
    }, 1500);

    (async () => {
      try {
        let tokenGuardado = null;
        let usuarioGuardado = null;

        if (Platform.OS === 'web') {
          if (typeof localStorage !== 'undefined') {
            tokenGuardado = localStorage.getItem(CLAVE_TOKEN);
            usuarioGuardado = localStorage.getItem(CLAVE_USUARIO);
          }
        } else {
          [tokenGuardado, usuarioGuardado] = await Promise.all([
            SecureStore.getItemAsync(CLAVE_TOKEN),
            SecureStore.getItemAsync(CLAVE_USUARIO),
          ]);
        }

        if (activo && tokenGuardado) {
          setToken(tokenGuardado);
          setUsuario(usuarioGuardado ? JSON.parse(usuarioGuardado) : null);
        }
      } catch {
        // Si no se puede leer, se arranca sin sesión.
      } finally {
        if (activo) {
          clearTimeout(timer);
          setCargando(false);
        }
      }
    })();

    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, []);

  const guardarSesion = useCallback(async (nuevoToken, nuevoUsuario) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CLAVE_TOKEN, nuevoToken);
        localStorage.setItem(CLAVE_USUARIO, JSON.stringify(nuevoUsuario ?? null));
      }
    } else {
      await SecureStore.setItemAsync(CLAVE_TOKEN, nuevoToken);
      await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(nuevoUsuario ?? null));
    }
    setMotivoCierre(null);
    setUsuario(nuevoUsuario ?? null);
    setToken(nuevoToken);
  }, []);

  const terminarSesion = useCallback(async (motivo) => {
    // Un registro push pendiente de esta sesión ya no debe aplicarse.
    vinculoPush.descartar();
    // HU-58: el widget no debe mostrar datos del usuario que se va.
    limpiarWidget();
    // Se suelta ya (sin esperar al efecto): un 401 tardío de este JWT, como el DELETE del token
    // push en segundo plano, no debe tomarse como "sesión vencida" de la sesión siguiente.
    tokenRef.current = null;
    setMotivoCierre(motivo);
    setToken(null);
    setUsuario(null);
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(CLAVE_TOKEN);
          localStorage.removeItem(CLAVE_USUARIO);
        }
      } else {
        await SecureStore.deleteItemAsync(CLAVE_TOKEN);
        await SecureStore.deleteItemAsync(CLAVE_USUARIO);
      }
    } catch {
      // El estado en memoria ya quedó limpio.
    }
  }, []);

  // Cierre pedido por el usuario: no deja aviso en Login y es inmediato. El token push se
  // desvincula en segundo plano con el JWT de esta sesión (capturado aquí); sus errores se ignoran.
  const cerrarSesion = useCallback(() => {
    const sesion = tokenRef.current;
    if (sesion) vinculoPush.desvincular(sesion);
    return terminarSesion(null);
  }, [terminarSesion]);

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

  // Registro del hook global para 401: si un endpoint con token responde 401, se cierra la sesión
  // solo si la petición se hizo con el token que sigue activo (evita que una petición vieja cierre
  // una sesión recién iniciada).
  useEffect(() => {
    setAlNoAutorizado((tokenPeticion) => {
      if (tokenPeticion && tokenPeticion === tokenRef.current) {
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
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return contexto;
}

// Hook de ayuda para servicios: apiFetch con el token de la sesión inyectado.
export function useApi() {
  const { token } = useAuth();
  return useCallback(
    (ruta, opciones = {}) => apiFetch(ruta, { ...opciones, token: token ?? undefined }),
    [token],
  );
}
