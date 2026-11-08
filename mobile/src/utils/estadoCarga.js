// Estados de una lista que se pide al servidor (HU-80). Sin imports para node --test.

// Qué mostrar: 'cargando' | 'error' | 'vacio' | 'lista'. `estado` es 'cargando' | 'listo' |
// 'error'; cualquier otro valor (p. ej. 'inactivo' sin sesión) cuenta como cargando.
export function vistaLista(estado, lista) {
  if (estado === 'error') return 'error';
  if (estado !== 'listo') return 'cargando';
  return Array.isArray(lista) && lista.length > 0 ? 'lista' : 'vacio';
}

// Solo se vuelve a pedir sola (al enfocar o al regresar a la app) una carga que falló: si está
// cargando ya va en camino y si está lista no hace falta.
export const debeReintentar = (estado) => estado === 'error';
