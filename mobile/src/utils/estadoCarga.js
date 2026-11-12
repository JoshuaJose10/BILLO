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

// Pantalla con datos que se conservan entre recargas (Inicio, HU-69): 'cargando' | 'error' |
// 'aviso' | 'datos'. Si ya hay datos a la vista, un error no los tapa: se avisa en una franja
// ('aviso') con Reintentar; sin datos, el error ocupa la pantalla. Nunca queda en blanco.
export function vistaPantalla(estado, hayDatos) {
  if (estado === 'error') return hayDatos ? 'aviso' : 'error';
  if (estado === 'listo' || hayDatos) return 'datos';
  return 'cargando';
}
