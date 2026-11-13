import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { MONEDA_DEFECTO } from '../utils/divisas';
import {
  MODO_TEMA_DEFECTO,
  normalizarModoTema,
  normalizarMonedaPreferida,
  resolverEsOscuro,
} from '../utils/preferencias';
import { temas } from './colors';

const CLAVE_MODO_TEMA = 'billo_preferencia_tema';
const CLAVE_MONEDA_PREFERIDA = 'billo_preferencia_moneda';

// Caché en memoria para evitar parpadeos si TemaProvider se vuelve a montar (p. ej. al terminar
// de cargar las fuentes en App.js).
const preferenciasMemoria = {
  modoTema: MODO_TEMA_DEFECTO,
  monedaPreferida: MONEDA_DEFECTO,
  cargado: false,
};

async function leerClavePreferencia(clave) {
  try {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(clave) : null;
    }
    return await SecureStore.getItemAsync(clave);
  } catch {
    return null;
  }
}

async function guardarClavePreferencia(clave, valor) {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(clave, valor);
      }
      return;
    }
    await SecureStore.setItemAsync(clave, valor);
  } catch {
    // El estado en memoria sigue activo aunque falle el almacenamiento local.
  }
}

const TemaContext = createContext(null);

// Tema claro u oscuro según la preferencia del usuario (HU-87: 'automatico' | 'claro' | 'oscuro')
// o el modo del sistema cuando está en 'automatico'. También expone y persiste en el teléfono la
// moneda preferida por defecto para Nuevo gasto. Estas preferencias viven en el dispositivo y se
// conservan al cerrar sesión o reiniciar la app.
export function TemaProvider({ children }) {
  const esquemaSistema = useColorScheme();
  const [modoTema, setModoTema] = useState(() => preferenciasMemoria.modoTema);
  const [monedaPreferida, setMonedaPreferida] = useState(() => preferenciasMemoria.monedaPreferida);

  useEffect(() => {
    let activo = true;
    (async () => {
      const [temaGuardado, monedaGuardada] = await Promise.all([
        leerClavePreferencia(CLAVE_MODO_TEMA),
        leerClavePreferencia(CLAVE_MONEDA_PREFERIDA),
      ]);
      const temaNormalizado = normalizarModoTema(temaGuardado);
      const monedaNormalizada = normalizarMonedaPreferida(monedaGuardada);
      preferenciasMemoria.modoTema = temaNormalizado;
      preferenciasMemoria.monedaPreferida = monedaNormalizada;
      preferenciasMemoria.cargado = true;
      if (activo) {
        setModoTema(temaNormalizado);
        setMonedaPreferida(monedaNormalizada);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const cambiarModoTema = useCallback(async (nuevoModo) => {
    const normalizado = normalizarModoTema(nuevoModo);
    preferenciasMemoria.modoTema = normalizado;
    setModoTema(normalizado);
    await guardarClavePreferencia(CLAVE_MODO_TEMA, normalizado);
  }, []);

  const cambiarMonedaPreferida = useCallback(async (nuevaMoneda) => {
    const normalizada = normalizarMonedaPreferida(nuevaMoneda);
    preferenciasMemoria.monedaPreferida = normalizada;
    setMonedaPreferida(normalizada);
    await guardarClavePreferencia(CLAVE_MONEDA_PREFERIDA, normalizada);
  }, []);

  const esOscuro = resolverEsOscuro(modoTema, esquemaSistema);

  const valor = useMemo(
    () => ({
      colors: esOscuro ? temas.oscuro : temas.claro,
      esOscuro,
      modoTema,
      cambiarModoTema,
      monedaPreferida,
      cambiarMonedaPreferida,
    }),
    [esOscuro, modoTema, cambiarModoTema, monedaPreferida, cambiarMonedaPreferida],
  );

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(valor.colors.background).catch(() => {
      // Sin el módulo nativo solo se pierde el fondo raíz; la app sigue igual.
    });
  }, [valor.colors.background]);

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

// { colors, esOscuro, modoTema, cambiarModoTema, monedaPreferida, cambiarMonedaPreferida } del tema activo.
export function useTema() {
  const ctx = useContext(TemaContext);
  if (!ctx) {
    throw new Error('useTema debe usarse dentro de <TemaProvider>');
  }
  return ctx;
}

// Estilos ya creados por función y tema: cada `crearEstilos` se ejecuta una vez por tema y lo
// comparten todas las instancias (filas, separadores...).
const cache = new WeakMap();

// Estilos del tema activo. `crearEstilos` es `(colors) => StyleSheet.create({...})`, definido
// fuera del componente para que sea siempre la misma función.
export function useEstilos(crearEstilos) {
  const { colors } = useTema();
  let porTema = cache.get(crearEstilos);
  if (!porTema) {
    porTema = new Map();
    cache.set(crearEstilos, porTema);
  }
  if (!porTema.has(colors)) {
    porTema.set(colors, crearEstilos(colors));
  }
  return porTema.get(colors);
}
