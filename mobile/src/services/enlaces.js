import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { navegacionRef } from '../navigation/navegacionRef';
import { destinoEnlace, parsearEnlace } from '../utils/enlaces';
import { navegadorRaiz } from '../utils/flujoInicio';

// Deep link billo://registrar (widget «Registrar por voz»): abre la hoja NuevoGasto con
// { tipo, iniciarVoz }. Llega con la app cerrada (getInitialURL) o en segundo plano / abierta
// (evento 'url'). Queda pendiente en memoria hasta que destinoEnlace diga 'abrir' (sesión iniciada
// y categorías elegidas) y se abre una sola vez. `listo` es el onReady del NavigationContainer.
// Si la hoja ya está abierta solo recibe los params nuevos y conserva lo capturado.
export function useAperturaDesdeEnlace(listo) {
  const { token, usuario, visitante, onboardingVisto, cargando } = useAuth();
  // El link pendiente va en una ref; `llegadas` solo vuelve a correr el efecto al recibir uno.
  const pendiente = useRef(null);
  const [llegadas, setLlegadas] = useState(0);

  useEffect(() => {
    const recibir = (url) => {
      const params = parsearEnlace(url);
      if (!params) return;
      pendiente.current = params;
      setLlegadas((n) => n + 1);
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
    const params = pendiente.current;
    pendiente.current = null;
    navegacionRef.navigate('NuevoGasto', params);
  }, [llegadas, listo, cargando, raiz]);
}
