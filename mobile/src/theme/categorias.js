// Colores de cada categoría predefinida (Luminal Glow, docs/diseno/paleta.md). La clave es el
// nombre del seed (backend/migrations/007_seed_categorias.sql); si se renombra una categoría
// ahí, hay que renombrarla aquí también. Se busca sin espacios a los lados y sin distinguir
// mayúsculas. Las desconocidas (personalizadas, renombradas, null) usan los valores de Otros.
//   base:       color vivo en tema oscuro (micro-punto, halo del chip, sombra del ícono).
//   baseClaro:  lo mismo en tema claro; donde el vivo no llega a 3:1 sobre los chips claros
//               (#F5F5F6) se usa un tono más profundo (tonos de Stitch claro).
//   fondoChip:  mismo tono más oscuro, con contraste >= 4.5:1 con texto blanco (ambos temas).
//   degradado:  [claro, centro, oscuro] diagonal del ícono, igual en ambos temas porque el glifo
//               es blanco. En Servicios y Salud el centro y el claro bajan para que el glifo
//               llegue a ~3:1 donde se dibuja.
const categorias = {
  Comida: {
    base: '#FF3B69',
    baseClaro: '#FF3B69',
    fondoChip: '#EA0037',
    degradado: ['#FF6C8F', '#FF3B69', '#BF2C4F'],
  },
  Transporte: {
    base: '#4F7FFF',
    baseClaro: '#3866F0',
    fondoChip: '#2F68FF',
    degradado: ['#7B9FFF', '#4F7FFF', '#3B5FBF'],
  },
  Entretenimiento: {
    base: '#7C3AED',
    baseClaro: '#7C3AED',
    fondoChip: '#7C3AED',
    degradado: ['#9D6BF2', '#7C3AED', '#5D2CB2'],
  },
  Servicios: {
    base: '#00C288',
    baseClaro: '#1E9A5D',
    fondoChip: '#00855D',
    degradado: ['#00C288', '#00A876', '#009266'],
  },
  Salud: {
    base: '#F472B6',
    baseClaro: '#EB4778',
    fondoChip: '#E0117E',
    degradado: ['#F472B6', '#F25EAC', '#B75689'],
  },
  Otros: {
    base: '#8E8E93',
    baseClaro: '#7C7C82',
    fondoChip: '#74747A',
    degradado: ['#AAAAAE', '#8E8E93', '#6B6B6E'],
  },
};

const normalizar = (nombre) =>
  String(nombre ?? '')
    .trim()
    .toLowerCase();

const porClave = new Map(Object.entries(categorias).map(([nombre, v]) => [normalizar(nombre), v]));

const buscar = (nombre) => porClave.get(normalizar(nombre)) ?? categorias.Otros;

// `esOscuro` es el del tema activo (useTema).
export function colorCategoria(nombre, esOscuro) {
  const categoria = buscar(nombre);
  return esOscuro ? categoria.base : categoria.baseClaro;
}

export function fondoChipCategoria(nombre) {
  return buscar(nombre).fondoChip;
}

export function degradadoCategoria(nombre) {
  return buscar(nombre).degradado;
}
