import { colors } from './colors';

// Color de cada categoría predefinida (Luminal Glow, docs/diseno/paleta.md). La clave es el
// nombre exacto del seed (backend/migrations/007_seed_categorias.sql); si se renombra una
// categoría ahí, hay que renombrarla aquí también.
export const coloresCategoria = {
  Comida: '#FF3B69',
  Transporte: '#4F7FFF',
  Entretenimiento: '#7C3AED',
  Servicios: '#00C288',
  Salud: '#F472B6',
  Otros: '#8E8E93',
};

// Degradado diagonal del ícono: [claro, base, oscuro]. Claro = 25% hacia blanco y oscuro = 25%
// hacia negro, precalculados para no mezclar colores en tiempo de ejecución.
const degradados = {
  Comida: ['#FF6C8F', '#FF3B69', '#BF2C4F'],
  Transporte: ['#7B9FFF', '#4F7FFF', '#3B5FBF'],
  Entretenimiento: ['#9D6BF2', '#7C3AED', '#5D2CB2'],
  Servicios: ['#40D1A6', '#00C288', '#009266'],
  Salud: ['#F795C8', '#F472B6', '#B75689'],
  Otros: ['#AAAAAE', '#8E8E93', '#6B6B6E'],
};

// Texto sobre el color sólido de la categoría. Blanco solo si su contraste WCAG es >= 4.5:1;
// si no, texto oscuro. Contrastes (blanco / #111114):
//   Comida 3.45 / 5.46 · Transporte 3.61 / 5.22 · Entretenimiento 5.70 / 3.31
//   Servicios 2.31 / 8.14 · Salud 2.65 / 7.12 · Otros 3.26 / 5.78
const textos = {
  Comida: colors.textoSobreClaro,
  Transporte: colors.textoSobreClaro,
  Entretenimiento: colors.text,
  Servicios: colors.textoSobreClaro,
  Salud: colors.textoSobreClaro,
  Otros: colors.textoSobreClaro,
};

// Las categorías desconocidas (personalizadas o renombradas) usan los valores de Otros.
const clave = (nombre) =>
  Object.prototype.hasOwnProperty.call(coloresCategoria, nombre ?? '') ? nombre : 'Otros';

export function colorCategoria(nombre) {
  return coloresCategoria[clave(nombre)];
}

export function degradadoCategoria(nombre) {
  return degradados[clave(nombre)];
}

export function textoSobreCategoria(nombre) {
  return textos[clave(nombre)];
}
