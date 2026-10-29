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

// Las categorías desconocidas (personalizadas o renombradas) usan el color de Otros.
export function colorCategoria(nombre) {
  return coloresCategoria[nombre] ?? coloresCategoria.Otros;
}
