// Aviso de presupuesto al guardar un gasto (RF4, HU-35). POST /gastos y PUT /gastos/:id agregan
// `alerta` = { categoria_id, porcentaje, estado: 'alerta' | 'excedido' } cuando el gasto deja su
// categoría cerca o por encima del límite (docs/api-contrato.md, "Aviso al registrar un gasto").
// Sin imports para poder probarlo con node --test.

export const ESTADOS_AVISO = ['alerta', 'excedido'];

const MENSAJES = {
  alerta: 'Te estás acercando a tu presupuesto',
  excedido: 'Te pasaste de tu presupuesto',
};

// La `alerta` de la respuesta con el porcentaje como número, o null si no viene, si el estado no
// amerita aviso (p. ej. 'ok') o si el porcentaje no es un número.
export function normalizarAlerta(alerta) {
  if (!alerta || !ESTADOS_AVISO.includes(alerta.estado)) return null;
  const porcentaje =
    typeof alerta.porcentaje === 'number' ? alerta.porcentaje : Number(alerta.porcentaje);
  if (alerta.porcentaje == null || !Number.isFinite(porcentaje)) return null;
  return { categoria_id: alerta.categoria_id, porcentaje, estado: alerta.estado };
}

// Texto del aviso a partir de la alerta y el nombre de la categoría:
//   { estado, titulo: 'Comida al 85%', mensaje: 'Te estás acercando…', texto: 'Comida al 85%. …' }
// `texto` es lo que se anuncia con el lector de pantalla. Sin nombre (categoría que no está en la
// lista) el título dice "Presupuesto al N%". Devuelve null si la alerta no amerita aviso.
export function contenidoAviso(alerta, nombreCategoria) {
  const normalizada = normalizarAlerta(alerta);
  if (!normalizada) return null;
  const nombre = typeof nombreCategoria === 'string' ? nombreCategoria.trim() : '';
  const titulo = `${nombre || 'Presupuesto'} al ${Math.round(normalizada.porcentaje)}%`;
  const mensaje = MENSAJES[normalizada.estado];
  return { estado: normalizada.estado, titulo, mensaje, texto: `${titulo}. ${mensaje}` };
}

// Nombre de la categoría con ese id en la lista [{ id, nombre }] (los ids pueden llegar como
// número o como texto). undefined si no está.
export function nombreCategoriaPorId(categorias, id) {
  if (id == null) return undefined;
  return (categorias || []).find((c) => String(c.id) === String(id))?.nombre;
}
