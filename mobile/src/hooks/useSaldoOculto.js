import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

import { CLAVE_SALDO_OCULTO } from '../utils/preferencias';
import { redibujarWidget } from '../widget/sincronizar';

// Preferencia «ocultar saldo» del ojito de Inicio (HU-82), guardada en SecureStore (ya instalado,
// como la sesión y el widget) para recordarla al reabrir la app.

// → [oculto, alternar]. Mientras se lee la preferencia `oculto` es true: así un saldo que el
// usuario ocultó no se asoma un instante al abrir Inicio. Si SecureStore falla, queda visible.
export function useSaldoOculto() {
  const [oculto, setOculto] = useState(null);

  useEffect(() => {
    let vigente = true;
    SecureStore.getItemAsync(CLAVE_SALDO_OCULTO)
      .then((valor) => vigente && setOculto(valor === '1'))
      .catch(() => vigente && setOculto(false));
    return () => {
      vigente = false;
    };
  }, []);

  const alternar = useCallback(() => {
    setOculto((actual) => {
      const nuevo = !actual;
      SecureStore.setItemAsync(CLAVE_SALDO_OCULTO, nuevo ? '1' : '0')
        .then(redibujarWidget)
        .catch(() => {});
      return nuevo;
    });
  }, []);

  return [oculto !== false, alternar];
}
