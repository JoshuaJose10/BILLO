// Cara de las tarjetas (Stitch 14_cartera_tarjetas_* y pila de 07_inicio_*): gradiente a 135° por
// tipo, igual en ambos temas. Varias del mismo tipo toman un tono distinto según su id.
const GRADIENTES = {
  credito: [
    ['#702EB2', '#A51CE2', '#E41B7C'],
    ['#7C3AED', '#A855F7', '#EC4899'],
    ['#6D28D9', '#C026D3', '#F43F5E'],
  ],
  debito: [
    ['#1458E4', '#1292EB', '#1CD6E6'],
    ['#1D4ED8', '#0EA5E9', '#22D3EE'],
    ['#2563EB', '#0284C7', '#14B8A6'],
  ],
};

export function degradadoTarjeta(tarjeta) {
  const tonos = GRADIENTES[tarjeta?.tipo === 'debito' ? 'debito' : 'credito'];
  return tonos[Math.abs(Number(tarjeta?.id) || 0) % tonos.length];
}

// Sobre el gradiente: texto suave, insignia y brillo superior (blanco translúcido) y el chip dorado.
export const caraTarjeta = {
  textoSuave: 'rgba(255, 255, 255, 0.75)',
  vidrio: 'rgba(255, 255, 255, 0.2)',
  brillo: ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0)'],
  borde: 'rgba(255, 255, 255, 0.22)',
  chip: ['#FDE68A', '#FEF3C7', '#FCD34D'],
  lineaChip: 'rgba(180, 83, 9, 0.3)',
};
