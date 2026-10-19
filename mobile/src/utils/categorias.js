// Ícono de MaterialCommunityIcons según el nombre de la categoría.
// GET /categorias solo devuelve { id, nombre }, así que el ícono se decide en la app.
// Equivalentes de los Material Symbols del diseño (restaurant, directions_car, theaters,
// bolt, health_and_safety, shopping_cart).
const ICONOS = [
  { claves: ['comida', 'restaurante', 'alimento'], icono: 'silverware-fork-knife' },
  { claves: ['super', 'mercado', 'despensa'], icono: 'cart-outline' },
  { claves: ['transporte', 'gasolina', 'uber', 'taxi'], icono: 'car' },
  { claves: ['entretenimiento', 'ocio', 'cine'], icono: 'filmstrip' },
  { claves: ['servicio', 'luz', 'agua', 'internet'], icono: 'lightning-bolt' },
  { claves: ['salud', 'medic', 'farmacia'], icono: 'shield-plus-outline' },
  { claves: ['casa', 'hogar', 'renta'], icono: 'home-outline' },
  { claves: ['educacion', 'escuela'], icono: 'school-outline' },
  { claves: ['ropa'], icono: 'tshirt-crew-outline' },
  { claves: ['mascota'], icono: 'paw' },
  { claves: ['viaje'], icono: 'airplane' },
  { claves: ['regalo'], icono: 'gift-outline' },
  { claves: ['otro'], icono: 'dots-horizontal-circle-outline' },
];

const ICONO_GENERICO = 'tag-outline';

// Minúsculas y sin acentos: "Educación" → "educacion".
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');
const normalizar = (texto) => (texto || '').toLowerCase().normalize('NFD').replace(DIACRITICOS, '');

export function iconoCategoria(nombre) {
  const n = normalizar(nombre);
  const encontrado = ICONOS.find(({ claves }) => claves.some((c) => n.includes(c)));
  return encontrado ? encontrado.icono : ICONO_GENERICO;
}
