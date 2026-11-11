import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { MODO_VISITANTE } from '../services/api';
import { useGastosService } from '../services/gastos';
import { nombreCategoriaPorId } from '../utils/avisos';
import { debeReintentar } from '../utils/estadoCarga';
import { categoriasDeGasto } from '../utils/presupuestos';
import { useAuth } from './AuthContext';

const CategoriasContext = createContext(null);

const SIN_DATOS = { sesion: null, lista: [], estado: 'cargando' };

// Caché de GET /categorias para la sesión (HU-39): se piden una vez al iniciar sesión (o al abrir
// la app con sesión guardada) y las comparten Inicio, Movimientos, Nuevo gasto y Presupuesto.
// Los datos se guardan junto con la sesión con la que se pidieron (el token, o MODO_VISITANTE en el
// modo exploración, donde salen de los datos de ejemplo sin llamar a la API): al cerrar sesión, salir
// del modo exploración o cambiar de usuario dejan de exponerse en ese mismo render y la siguiente
// sesión vuelve a pedirlas.
//   const { categorias, categoriasGasto, estado, recargar, nombrePorId } = useCategorias();
// - estado: 'cargando' | 'listo' | 'error' ('inactivo' sin sesión). Si falla, cada pantalla
//   ofrece Reintentar, que llama a recargar(). Además se reintenta solo (HU-80) al volver la app a
//   primer plano y al enfocar una pantalla que use useReintentarCategoriasAlEnfocar(): así una
//   primera carga fallida (backend apagado, sin red justo después del login) no queda en error.
// - categoriasGasto: solo las de tipo gasto (las que no traen tipo se aceptan; ver
//   categoriasDeGasto).
export function CategoriasProvider({ children }) {
  const { token, visitante } = useAuth();
  const sesion = token ?? (visitante ? MODO_VISITANTE : null);
  const { listarCategorias } = useGastosService();
  const [datos, setDatos] = useState(SIN_DATOS);
  // Cada petición recibe un número; si al responder ya hay una más nueva, se descarta.
  const ultimaPeticion = useRef(0);

  // Los setDatos van en los callbacks de la promesa (nunca síncronos), así que pedir() se puede
  // llamar desde el efecto.
  const pedir = useCallback(() => {
    const peticion = ++ultimaPeticion.current;
    listarCategorias()
      .then((lista) => {
        if (peticion === ultimaPeticion.current) {
          setDatos({ sesion, lista: lista || [], estado: 'listo' });
        }
      })
      .catch(() => {
        if (peticion === ultimaPeticion.current) setDatos({ sesion, lista: [], estado: 'error' });
      });
  }, [listarCategorias, sesion]);

  // Una vez por sesión (listarCategorias cambia solo cuando cambia el token o el modo).
  useEffect(() => {
    if (sesion) pedir();
  }, [sesion, pedir]);

  const recargar = useCallback(() => {
    if (!sesion) return;
    setDatos((d) => ({ ...d, estado: 'cargando' }));
    pedir();
  }, [sesion, pedir]);

  const vigentes = sesion != null && datos.sesion === sesion;
  const categorias = vigentes ? datos.lista : SIN_DATOS.lista;
  const estado = !sesion ? 'inactivo' : vigentes ? datos.estado : 'cargando';

  // El estado actual en una ref: los reintentos automáticos lo leen sin volver a suscribirse en
  // cada cambio (si dependieran de `estado`, un error persistente se reintentaría en bucle).
  const estadoRef = useRef(estado);
  useEffect(() => {
    estadoRef.current = estado;
  }, [estado]);

  const reintentarSiFallo = useCallback(() => {
    if (debeReintentar(estadoRef.current)) recargar();
  }, [recargar]);

  // Al volver a primer plano (p. ej. tras encender el backend o recuperar la red).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estadoApp) => {
      if (estadoApp === 'active') reintentarSiFallo();
    });
    return () => sub.remove();
  }, [reintentarSiFallo]);

  const valor = useMemo(
    () => ({
      categorias,
      categoriasGasto: categoriasDeGasto(categorias),
      estado,
      recargar,
      // Nombre de la categoría con ese id (número o texto); undefined si no está.
      nombrePorId: (id) => nombreCategoriaPorId(categorias, id),
      reintentarSiFallo,
    }),
    [categorias, estado, recargar, reintentarSiFallo],
  );

  return <CategoriasContext.Provider value={valor}>{children}</CategoriasContext.Provider>;
}

// { categorias, categoriasGasto, estado, recargar, nombrePorId }
export function useCategorias() {
  const ctx = useContext(CategoriasContext);
  if (!ctx) {
    throw new Error('useCategorias debe usarse dentro de <CategoriasProvider>');
  }
  return ctx;
}

// Para las pantallas que muestran categorías: al ganar foco las vuelve a pedir si quedaron en error.
export function useReintentarCategoriasAlEnfocar() {
  const { reintentarSiFallo } = useCategorias();
  useFocusEffect(reintentarSiFallo);
}
