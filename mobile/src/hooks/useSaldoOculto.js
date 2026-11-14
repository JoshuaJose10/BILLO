import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

// Preferencia «ocultar saldo» del ojito de Inicio (HU-82), guardada en SecureStore (ya instalado,
// como la sesión y el widget) para recordarla al reabrir la app.
const CLAVE = 'billo_saldo_oculto';

// → [oculto, alternar]. Mientras se lee la preferencia `oculto` es true: así un saldo que el
// usuario ocultó no se asoma un instante al abrir Inicio. Si SecureStore falla, queda visible.
export function useSaldoOculto() {
  const [oculto, setOculto] = useState(null);

  useEffect(() => {
    let vigente = true;
    SecureStore.getItemAsync(CLAVE)
      .then((valor) => vigente && setOculto(valor === '1'))
      .catch(() => vigente && setOculto(false));
    return () => {
      vigente = false;
    };
  }, []);

  const alternar = useCallback(() => {
    setOculto((actual) => {
      const nuevo = !actual;
      SecureStore.setItemAsync(CLAVE, nuevo ? '1' : '0').catch(() => {});
      return nuevo;
    });
  }, []);

  return [oculto !== false, alternar];
}
