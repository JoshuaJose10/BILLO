// Reglas del teclado numérico para capturar un monto como texto ("1234.50").
export const MAX_ENTEROS = 9;
export const MAX_DECIMALES = 2;

export const TECLA_PUNTO = '.';
export const TECLA_BORRAR = 'borrar';

// Devuelve el nuevo texto tras pulsar `tecla`, o el mismo si la tecla no aplica:
// un solo punto, máximo 2 decimales, máximo 9 enteros y sin ceros a la izquierda.
export function aplicarTecla(texto, tecla) {
  if (tecla === TECLA_BORRAR) return texto.slice(0, -1);

  const [entero, decimales] = texto.split('.');
  const tienePunto = decimales !== undefined;

  if (tecla === TECLA_PUNTO) {
    if (tienePunto) return texto;
    return texto === '' ? '0.' : `${texto}.`;
  }

  if (!/^\d$/.test(tecla)) return texto;

  if (tienePunto) {
    return decimales.length >= MAX_DECIMALES ? texto : texto + tecla;
  }
  if (entero === '0') return tecla === '0' ? texto : tecla;
  if (entero.length >= MAX_ENTEROS) return texto;
  return texto + tecla;
}

// "12." → 12, "" → 0
export function montoDesdeTexto(texto) {
  const n = Number(texto);
  return Number.isFinite(n) ? n : 0;
}
