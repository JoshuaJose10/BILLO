import { CommonActions } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { navegacionRef } from '../navigation/navegacionRef';
import { destinoEnlace, parsearEnlace } from '../utils/enlaces';
import { navegadorRaiz } from '../utils/flujoInicio';
import { destinoWidget } from '../utils/widgetResumen';

// Deep links de los widgets de Android:
// - billo://registrar (widget «Registrar por voz» y botones de «Billo»): abre la hoja NuevoGasto
//   con { tipo, iniciarVoz }.
// - billo://inicio, billo://balance, billo://dona, billo://cobro (widgets de Balance, Dona y
//   Próximo cobro): abre la pantalla correspondiente dentro de Main.
export function useAperturaDesdeEnlace(listo) {
  const { token, usuario, visitante, onboardingVisto, cargando } = useAuth();
  const pendiente = useRef(null);
  const [llegadas, setLlegadas] = useState(0);

  useEffect(() => {
    const recibir = (url) => {
      const paramsRegistrar = parsearEnlace(url);
      if (paramsRegistrar) {
        pendiente.current = { tipo: 'hoja', params: paramsRegistrar };
        setLlegadas((n) => n + 1);
        return;
      }
      const destino = destinoWidget(url);
      if (destino) {
        pendiente.current = { tipo: 'tab', destino };
        setLlegadas((n) => n + 1);
      }
    };
    Linking.getInitialURL()
      .then(recibir)
      .catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => recibir(url));
    return () => sub.remove();
  }, []);

  const raiz = navegadorRaiz({ token, usuario, visitante, onboardingVisto });
  useEffect(() => {
    if (!pendiente.current || !listo || cargando || !navegacionRef.isReady()) return;
    if (destinoEnlace(raiz) !== 'abrir') return;
    const accion = pendiente.current;
    pendiente.current = null;
    if (accion.tipo === 'hoja') {
      navegacionRef.navigate('NuevoGasto', accion.params);
    } else if (accion.tipo === 'tab') {
      navegacionRef.dispatch(
        CommonActions.navigate({
          name: 'Main',
          params: {
            screen: accion.destino.screen,
            params: accion.destino.params
              ? { ...accion.destino.params, solicitud: Date.now() }
              : undefined,
          },
          pop: true,
        }),
      );
    }
  }, [llegadas, listo, cargando, raiz]);
}
