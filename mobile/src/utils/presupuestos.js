// Reglas de presentación de los presupuestos (RF3). El `estado` y el `porcentaje` de cada
// presupuesto los calcula la API (docs/api-contrato.md, "Presupuestos"); aquí no se recalculan.
// Sin imports para poder probarlo con node --test.

export const ESTADOS = ['ok', 'alerta', 'excedido'];

const numero = (valor) => {
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const redondear2 = (n) => Math.round(n * 100) / 100;

// Montos y porcentaje como número (NUMERIC de Postgres puede llegar como texto). Un estado
// desconocido se trata como 'ok'.
export function normalizarPresupuesto(presupuesto) {
  return {
    ...presupuesto,
    monto_limite: numero(presupuesto.monto_limite),
    gastado: numero(presupuesto.gastado),
    porcentaje: numero(presupuesto.porcentaje),
    estado: ESTADOS.includes(presupuesto.estado) ? presupuesto.estado : 'ok',
  };
}

// Solo categorías de gasto. GET /categorias aún no devuelve `tipo` (HU-18): las que no lo
// traen se aceptan.
export function categoriasDeGasto(categorias) {
  return (categorias || []).filter((c) => c.tipo == null || c.tipo === 'gasto');
}

// Fracción de la barra (0 a 1) a partir del porcentaje de la API; tope visual del 100%.
export function avanceBarra(porcentaje) {
  return Math.min(Math.max(numero(porcentaje) / 100, 0), 1);
}

// Lo que se pasó del límite (0 si no se pasó).
export function excedente({ gastado, monto_limite }) {
  return Math.max(redondear2(numero(gastado) - numero(monto_limite)), 0);
}

// Lo gastado en cada categoría con presupuesto, en el formato de gastoPorCategoria
// (utils/resumenMes.js) para dibujar la barra por categorías del resumen de Cartera:
// [{ id, nombre, total }] de mayor a menor.
export function gastoPorCategoriaDePresupuestos(presupuestos) {
  return (presupuestos || [])
    .map((p) => ({ id: String(p.categoria_id), nombre: p.categoria, total: numero(p.gastado) }))
    .sort((a, b) => b.total - a.total);
}

// El estado más grave de la lista (para el color del resumen): excedido > alerta > ok.
export function estadoMasGrave(presupuestos) {
  return (presupuestos || []).reduce(
    (peor, p) => (ESTADOS.indexOf(p.estado) > ESTADOS.indexOf(peor) ? p.estado : peor),
    'ok',
  );
}

// Presupuestos en riesgo para Inicio: solo 'alerta' y 'excedido', primero los excedidos y luego
// de mayor a menor porcentaje.
export function presupuestosEnRiesgo(presupuestos) {
  return (presupuestos || [])
    .filter((p) => p.estado === 'alerta' || p.estado === 'excedido')
    .sort(
      (a, b) =>
        ESTADOS.indexOf(b.estado) - ESTADOS.indexOf(a.estado) ||
        numero(b.porcentaje) - numero(a.porcentaje),
    );
}

// Totales del mes: suma de límites y de gastado, y el porcentaje redondeado.
export function resumenPresupuestos(presupuestos) {
  const lista = presupuestos || [];
  const limite = redondear2(lista.reduce((s, p) => s + numero(p.monto_limite), 0));
  const gastado = redondear2(lista.reduce((s, p) => s + numero(p.gastado), 0));
  return {
    limite,
    gastado,
    porcentaje: limite > 0 ? Math.round((gastado * 100) / limite) : 0,
    estado: estadoMasGrave(lista),
  };
}
