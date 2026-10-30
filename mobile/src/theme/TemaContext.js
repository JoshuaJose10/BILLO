import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { temas } from './colors';

const TemaContext = createContext(null);

// Tema claro u oscuro según el modo del sistema. useColorScheme se actualiza en vivo, así que al
// cambiar el modo con la app abierta todo se repinta sin reiniciar. Si el sistema no informa un
// modo se queda en oscuro, el diseño original de la app.
export function TemaProvider({ children }) {
  const esOscuro = useColorScheme() !== 'light';
  const valor = useMemo(
    () => ({ colors: esOscuro ? temas.oscuro : temas.claro, esOscuro }),
    [esOscuro],
  );
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

// { colors, esOscuro } del tema activo.
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
