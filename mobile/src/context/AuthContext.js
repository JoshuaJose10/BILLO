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

import { responderEjemplo } from '../datos/ejemplo';
import { apiFetch, setAlNoAutorizado, setModoVisitante } from '../services/api';
import * as authService from '../services/auth';
import { vinculoPush } from '../services/tokenPush';

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
  // Modo exploración (HU-50): sin JWT y con datos de ejemplo en memoria. Vive solo en este estado
  // (no se guarda en SecureStore): al cerrar la app se vuelve a Login.
  const [visitante, setVisitante] = useState(false);
  // Pantalla con la que abre Auth: 'Registro' cuando el visitante sale con "Crear cuenta".
  const [entradaAuth, setEntradaAuth] = useState('Login');
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
    setEntradaAuth('Login');
    setUsuario(nuevoUsuario ?? null);
    setToken(nuevoToken);
  }, []);

  const terminarSesion = useCallback(async (motivo) => {
    // Un registro push pendiente de esta sesión ya no debe aplicarse.
    vinculoPush.descartar();
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

  // "Explorar sin cuenta" en Login. La guardia de apiFetch se activa antes del render que monta
  // las pantallas, así que ninguna petición alcanza a salir.
  const explorarSinCuenta = useCallback(() => {
    setModoVisitante(true);
    setMotivoCierre(null);
    setVisitante(true);
  }, []);

  // Sale del modo exploración hacia 'Registro' (Crear cuenta) o 'Login'. Al desmontarse Main se
  // descarta todo el estado de las pantallas y la caché de categorías deja de exponerse; los datos
  // de ejemplo nunca se escribieron en ningún lado, así que la cuenta que entre empieza vacía.
  const salirDeVisitante = useCallback((destino = 'Registro') => {
    setModoVisitante(false);
    setEntradaAuth(destino);
    setVisitante(false);
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
      visitante,
      entradaAuth,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      limpiarMotivoCierre,
      explorarSinCuenta,
      salirDeVisitante,
    }),
    [
      token,
      usuario,
      cargando,
      motivoCierre,
      visitante,
      entradaAuth,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      limpiarMotivoCierre,
      explorarSinCuenta,
      salirDeVisitante,
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

// Hook de ayuda para servicios: apiFetch con el token de la sesión inyectado. En modo exploración
// responde con los datos de ejemplo (misma forma que la API) y nunca llama a apiFetch.
export function useApi() {
  const { token, visitante } = useAuth();
  return useCallback(
    (ruta, opciones = {}) =>
      visitante
        ? responderEjemplo(ruta, opciones)
        : apiFetch(ruta, { ...opciones, token: token ?? undefined }),
    [token, visitante],
  );
}
