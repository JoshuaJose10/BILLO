// Cara de las tarjetas (Stitch 14_cartera_tarjetas_* y pila de 07_inicio_*): gradiente a 135°,
// igual en ambos temas. Se elige por id entre todos (id % 10, sin importar el tipo: lo dice la
// insignia), así dos tarjetas seguidas nunca salen iguales.
const GRADIENTES = [
  ['#702EB2', '#A51CE2', '#E41B7C'], // violeta → magenta (Stitch, crédito)
  ['#1458E4', '#1292EB', '#1CD6E6'], // azul → cian (Stitch, débito)
  ['#065F46', '#115E59', '#155E75'], // esmeralda → turquesa
  ['#7C3AED', '#A855F7', '#EC4899'],
  ['#9A3412', '#BE123C', '#9D174D'], // naranja → rosa
  ['#1D4ED8', '#0EA5E9', '#22D3EE'],
  ['#3730A3', '#4338CA', '#1D4ED8'], // índigo → azul
  ['#6D28D9', '#C026D3', '#F43F5E'],
  ['#1F2937', '#374151', '#4B5563'], // grafito → plata
  ['#2563EB', '#0284C7', '#14B8A6'],
];

export function degradadoTarjeta(tarjeta) {
  const id = Math.abs(Math.trunc(Number(tarjeta?.id) || 0));
  return GRADIENTES[id % GRADIENTES.length];
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
