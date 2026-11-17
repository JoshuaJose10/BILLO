// Colores de cada categoría predefinida (Luminal Glow, docs/diseno/paleta.md). La clave es el
// nombre del seed (backend/migrations/007_seed_categorias.sql y 021_categorias_base_ampliadas.sql); si se renombra una categoría
// ahí, hay que renombrarla aquí también. Se busca sin espacios a los lados y sin distinguir
// mayúsculas. Las desconocidas (personalizadas, renombradas, null) usan los valores de Otros.
//   base:       color vivo en tema oscuro (micro-punto, halo del chip, sombra del ícono).
//   baseClaro:  lo mismo en tema claro (menos la sombra del ícono); donde el vivo no llega a 3:1
//               sobre los chips claros se usa un tono más profundo (tonos de Stitch claro).
//   fondoChip:  mismo tono más oscuro, con contraste >= 4.5:1 con texto blanco (ambos temas).
//   degradado:  [claro, centro, oscuro] diagonal del ícono en tema oscuro. En Servicios y Salud el
//               centro y el claro bajan para que el glifo blanco llegue a ~3:1 donde se dibuja.
//   degradadoClaro: el del tema claro, luminoso como los íconos de 07_inicio_claro: 22% hacia
//               blanco, la base viva al centro y apenas 10% hacia negro al final. Su centro es
//               también el color de la sombra del ícono en claro.
const categorias = {
  Comida: {
    base: '#FF3B69',
    baseClaro: '#FF3B69',
    fondoChip: '#EA0037',
    degradado: ['#FF6C8F', '#FF3B69', '#BF2C4F'],
    degradadoClaro: ['#FF668A', '#FF3B69', '#E6355F'],
  },
  Transporte: {
    base: '#4F7FFF',
    baseClaro: '#3866F0',
    fondoChip: '#2F68FF',
    degradado: ['#7B9FFF', '#4F7FFF', '#3B5FBF'],
    degradadoClaro: ['#769BFF', '#4F7FFF', '#4772E6'],
  },
  Entretenimiento: {
    base: '#7C3AED',
    baseClaro: '#7C3AED',
    fondoChip: '#7C3AED',
    degradado: ['#9D6BF2', '#7C3AED', '#5D2CB2'],
    degradadoClaro: ['#9965F1', '#7C3AED', '#7034D5'],
  },
  Servicios: {
    base: '#00C288',
    baseClaro: '#1E9A5D',
    fondoChip: '#00855D',
    degradado: ['#00C288', '#00A876', '#009266'],
    degradadoClaro: ['#38CFA2', '#00C288', '#00AF7A'],
  },
  Salud: {
    base: '#F472B6',
    baseClaro: '#EB4778',
    fondoChip: '#E0117E',
    degradado: ['#F472B6', '#F25EAC', '#B75689'],
    degradadoClaro: ['#F691C6', '#F472B6', '#DC67A4'],
  },
  // Predefinidas ampliadas (backend/migrations/021_categorias_base_ampliadas.sql): tonos fuera de
  // los de arriba (rosas, azul, violeta, verde, celeste); mismos contrastes (fondoChip >= 4.5:1
  // con texto blanco, centro del degradado >= 3:1 con el glifo).
  'Comida rápida': {
    base: '#FF7A1A',
    baseClaro: '#EB7018',
    fondoChip: '#B85812',
    degradado: ['#F09452', '#EB7018', '#B05412'],
    degradadoClaro: ['#EF8F4B', '#EB7018', '#D46516'],
  },
  Súper: {
    base: '#84CC16',
    baseClaro: '#689F10',
    fondoChip: '#54820C',
    degradado: ['#8EB74C', '#689F10', '#4E770C'],
    degradadoClaro: ['#89B445', '#689F10', '#5E8F0E'],
  },
  Café: {
    base: '#A47148',
    baseClaro: '#A47148',
    fondoChip: '#9D6C45',
    degradado: ['#BB9576', '#A47148', '#7B5536'],
    degradadoClaro: ['#B89070', '#A47148', '#946641'],
  },
  Hogar: {
    base: '#7C8DA6',
    baseClaro: '#7C8DA6',
    fondoChip: '#657387',
    degradado: ['#9DAABC', '#7C8DA6', '#5D6A7D'],
    degradadoClaro: ['#99A6BA', '#7C8DA6', '#707F95'],
  },
  Ropa: {
    base: '#D946EF',
    baseClaro: '#D946EF',
    fondoChip: '#B83BCB',
    degradado: ['#E374F3', '#D946EF', '#A335B3'],
    degradadoClaro: ['#E16FF3', '#D946EF', '#C33FD7'],
  },
  Educación: {
    base: '#14B8A6',
    baseClaro: '#11A393',
    fondoChip: '#0C8478',
    degradado: ['#4DBAAE', '#11A393', '#0D7A6E'],
    degradadoClaro: ['#45B7AB', '#11A393', '#0F9384'],
  },
  Mascotas: {
    base: '#F5B301',
    baseClaro: '#C08C01',
    fondoChip: '#966D01',
    degradado: ['#D0A941', '#C08C01', '#906901'],
    degradadoClaro: ['#CEA539', '#C08C01', '#AD7E01'],
  },
  'Cuidado personal': {
    base: '#A78BFA',
    baseClaro: '#9A80E6',
    fondoChip: '#7E68BC',
    degradado: ['#B3A0EC', '#9A80E6', '#7460AD'],
    degradadoClaro: ['#B09CEC', '#9A80E6', '#8B73CF'],
  },
  // Cobros de suscripciones en Inicio y Movimientos cuando el servicio no tiene logo propio.
  // El centro baja a sky-600 para que el glifo blanco llegue a ~4:1.
  Suscripción: {
    base: '#38BDF8',
    baseClaro: '#0284C7',
    fondoChip: '#0369A1',
    degradado: ['#38BDF8', '#0284C7', '#0369A1'],
    degradadoClaro: ['#3A9FD3', '#0284C7', '#0277B3'],
  },
  Otros: {
    base: '#8E8E93',
    baseClaro: '#7C7C82',
    fondoChip: '#74747A',
    degradado: ['#AAAAAE', '#8E8E93', '#6B6B6E'],
    degradadoClaro: ['#A7A7AB', '#8E8E93', '#808084'],
  },
};

const normalizar = (nombre) =>
  String(nombre ?? '')
    .trim()
    .toLowerCase();

const porClave = new Map(Object.entries(categorias).map(([nombre, v]) => [normalizar(nombre), v]));

// Categorías propias del usuario (HU-89 / HU-90): usan el color hexadecimal asignado por el
// servidor y el ícono genérico `tag-outline`.
export const ICONO_CATEGORIA_PROPIA = 'tag-outline';

const HEX_COLOR = /^#([0-9a-f]{6})$/i;

function mezclarHex(hex, destinoHex, factor) {
  const limpio = hex.replace('#', '');
  const destino = destinoHex.replace('#', '');
  const canales = [0, 2, 4].map((offset) => {
    const a = parseInt(limpio.slice(offset, offset + 2), 16);
    const b = parseInt(destino.slice(offset, offset + 2), 16);
    const valor = Math.round(a + (b - a) * factor);
    return Math.max(0, Math.min(255, valor)).toString(16).padStart(2, '0');
  });
  return `#${canales.join('').toUpperCase()}`;
}

export function paletaDesdeColor(colorHex) {
  const base =
    typeof colorHex === 'string' && HEX_COLOR.test(colorHex.trim())
      ? colorHex.trim().toUpperCase()
      : categorias.Otros.base;
  const claro = mezclarHex(base, '#FFFFFF', 0.22);
  const oscuro = mezclarHex(base, '#000000', 0.25);
  const oscuroClaro = mezclarHex(base, '#000000', 0.1);
  const fondoChip = mezclarHex(base, '#000000', 0.18);
  return {
    base,
    baseClaro: base,
    fondoChip,
    degradado: [claro, base, oscuro],
    degradadoClaro: [claro, base, oscuroClaro],
  };
}

const coloresPropios = new Map();

// Registra en memoria los colores de las categorías propias cargadas de la API para que
// `colorCategoria`, `fondoChipCategoria`, `degradadoCategoria` y `sombraCategoria` respondan con
// el color asignado por el servidor en Nuevo gasto, Inicio, Movimientos y Reportes.
export function registrarColoresCategorias(lista) {
  coloresPropios.clear();
  for (const item of lista || []) {
    if (!item || typeof item.nombre !== 'string') continue;
    const clave = normalizar(item.nombre);
    if (!clave || porClave.has(clave)) continue;
    if (item.color || item.propia || item.es_predefinida === false) {
      coloresPropios.set(clave, paletaDesdeColor(item.color));
    }
  }
}

export function limpiarColoresCategorias() {
  coloresPropios.clear();
}

export function esCategoriaPropia(nombre) {
  const clave = normalizar(nombre);
  if (!clave) return false;
  return !porClave.has(clave);
}

const buscar = (nombre) => {
  const clave = normalizar(nombre);
  return porClave.get(clave) ?? coloresPropios.get(clave) ?? categorias.Otros;
};

// `esOscuro` es el del tema activo (useTema).
export function colorCategoria(nombre, esOscuro) {
  const categoria = buscar(nombre);
  return esOscuro ? categoria.base : categoria.baseClaro;
}

export function fondoChipCategoria(nombre) {
  return buscar(nombre).fondoChip;
}

export function degradadoCategoria(nombre, esOscuro) {
  const categoria = buscar(nombre);
  return esOscuro ? categoria.degradado : categoria.degradadoClaro;
}

// Ícono de un ingreso (HU-82): degradado en el verde exito, con el centro algo más profundo para
// que el glifo blanco conserve contraste (como Servicios).
const INGRESO = {
  degradado: ['#34D399', '#0E9F6E', '#0B7F58'],
  degradadoClaro: ['#3FBF8F', '#0FA372', '#0E8F64'],
};

export function degradadoIngreso(esOscuro) {
  return esOscuro ? INGRESO.degradado : INGRESO.degradadoClaro;
}

// Color de la sombra de IconoCategoria: la base en oscuro y la base viva del degradado en claro
// (baseClaro es más profundo para el micro-punto y ensuciaría la sombra).
export function sombraCategoria(nombre, esOscuro) {
  const categoria = buscar(nombre);
  return esOscuro ? categoria.base : categoria.degradadoClaro[1];
}
