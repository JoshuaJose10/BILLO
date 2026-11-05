import { CommonActions } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo } from 'react-native';

import AvisoPresupuesto from '../components/AvisoPresupuesto';
import { navegacionRef } from '../navigation/navegacionRef';

const AvisosContext = createContext(null);

// Espera antes de anunciar el aviso con el lector de pantalla: al cerrarse la hoja cambia el foco y
// VoiceOver cortaría un anuncio inmediato.
const RETRASO_ANUNCIO = 600;

// Avisos globales encima de toda la app (HU-35, RF4). Va dentro del NavigationContainer para que
// el aviso se dibuje sobre las pestañas y pueda navegar; no vive en la hoja de Nuevo gasto
// porque esa hoja se cierra al guardar.
//   const { mostrarAviso } = useAvisos();
//   mostrarAviso({ estado: 'alerta' | 'excedido', titulo, mensaje, texto, mes? });
// El contenido lo arma contenidoAviso (utils/avisos.js); `mes` ('YYYY-MM') es el del gasto y es el
// que se abre en Cartera al tocar el aviso. Un aviso nuevo reemplaza al que esté visible.
export function AvisosProvider({ children }) {
  const [aviso, setAviso] = useState(null);
  const siguienteId = useRef(0);
  const anuncio = useRef(null);

  useEffect(() => () => clearTimeout(anuncio.current), []);

  const mostrarAviso = useCallback((contenido) => {
    if (!contenido) return;
    siguienteId.current += 1;
    setAviso({ ...contenido, id: siguienteId.current });
    Haptics.notificationAsync(
      contenido.estado === 'excedido'
        ? Haptics.NotificationFeedbackType.Error
        : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => {});
    clearTimeout(anuncio.current);
    anuncio.current = setTimeout(
      () => AccessibilityInfo.announceForAccessibility(contenido.texto),
      RETRASO_ANUNCIO,
    );
  }, []);

  // Solo quita el aviso que terminó de salir; si ya lo reemplazó otro, lo deja.
  const alCerrar = useCallback(
    (id) => setAviso((actual) => (actual?.id === id ? null : actual)),
    [],
  );

  // Pestaña Cartera en la sección Presupuestos y el mes del gasto. `pop` regresa a Main si hay una
  // hoja encima; `solicitud` hace que Cartera aplique los parámetros aunque ya estuviera abierta.
  const abrirPresupuestos = useCallback(({ mes }) => {
    if (!navegacionRef.isReady()) return;
    navegacionRef.dispatch(
      CommonActions.navigate({
        name: 'Main',
        params: {
          screen: 'Cartera',
          params: { seccion: 'presupuestos', mes, solicitud: Date.now() },
        },
        pop: true,
      }),
    );
  }, []);

  const valor = useMemo(() => ({ mostrarAviso }), [mostrarAviso]);

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      {aviso ? (
        <AvisoPresupuesto
          key={aviso.id}
          aviso={aviso}
          onTocar={abrirPresupuestos}
          onCerrado={alCerrar}
        />
      ) : null}
    </AvisosContext.Provider>
  );
}

// { mostrarAviso }
export function useAvisos() {
  const ctx = useContext(AvisosContext);
  if (!ctx) {
    throw new Error('useAvisos debe usarse dentro de <AvisosProvider>');
  }
  return ctx;
}
