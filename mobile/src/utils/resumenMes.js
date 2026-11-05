// Cálculos de la tarjeta "Gastado este mes" de Inicio: gasto por categoría, tramos de la barra,
// porcentaje del presupuesto y excedente. Sin imports para poder probarlo con node --test.

const redondear2 = (n) => Math.round(n * 100) / 100;
const formatoPesos = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

// Gasto por categoría del mes: [{ id, nombre, total }] de mayor a menor. `nombres` = { id: nombre }.
// Las primeras son los chips de la tarjeta; todas son los tramos de la barra.
export function gastoPorCategoria(gastos, nombres = {}) {
  const totales = {};
  (gastos || []).forEach((g) => {
    totales[g.categoria_id] = (totales[g.categoria_id] || 0) + g.monto;
  });
  return Object.entries(totales)
    .map(([id, total]) => ({ id, nombre: nombres[id], total: redondear2(total) }))
    .sort((a, b) => b.total - a.total);
}

// Nivel del porcentaje gastado del presupuesto (color del "25%"): normal < 80, aviso de 80 a 100,
// alerta > 100.
export function nivelPorcentaje(porcentaje) {
  if (porcentaje > 100) return 'alerta';
  if (porcentaje >= 80) return 'aviso';
  return 'normal';
}

// Resumen del mes para la tarjeta. `presupuesto`: suma de los límites del mes (0 o null si no hay).
// `gastadoServidor`: gasto_variable de GET /reportes/resumen; si viene, es el "gastado" que se
// muestra (los tramos siguen saliendo de los gastos del mes, que suman lo mismo).
// - Con presupuesto, cada tramo mide gasto / max(presupuesto, gastado): si se pasó, la barra
//   queda llena; si no, el hueco es lo que falta del presupuesto.
// - Sin presupuesto, los tramos llenan el 100% en proporción al gasto.
// `porcentaje` es null sin presupuesto.
export function resumenGastoMes(porCategoria, presupuesto, gastadoServidor) {
  const categorias = porCategoria || [];
  const gastado = Number.isFinite(gastadoServidor)
    ? redondear2(gastadoServidor)
    : redondear2(categorias.reduce((s, c) => s + c.total, 0));
  const limite = presupuesto > 0 ? presupuesto : 0;
  const escala = limite > 0 ? Math.max(limite, gastado) : gastado;
  return {
    gastado,
    presupuesto: limite,
    porcentaje: limite > 0 ? Math.round((gastado * 100) / limite) : null,
    excedente: limite > 0 ? Math.max(redondear2(gastado - limite), 0) : 0,
    tramos: categorias
      .filter((c) => c.total > 0)
      .map((c) => ({ ...c, fraccion: escala > 0 ? c.total / escala : 0 })),
  };
}

// Etiqueta de la barra para el lector de pantalla:
// "Gastado 1,237 de 5,000 pesos, 25%. Comida 560, Servicios 422, Transporte 255".
export function etiquetaBarraMes(resumen) {
  const pesos = (n) => formatoPesos.format(Math.round(n));
  const total =
    resumen.presupuesto > 0
      ? `Gastado ${pesos(resumen.gastado)} de ${pesos(resumen.presupuesto)} pesos, ${resumen.porcentaje}%`
      : `Gastado ${pesos(resumen.gastado)} pesos`;
  const detalle = resumen.tramos.map((t) => `${t.nombre ?? 'Sin categoría'} ${pesos(t.total)}`);
  return detalle.length ? `${total}. ${detalle.join(', ')}` : total;
}
