// Costo compartido (HU-76). Misma fórmula que mobile/src/utils/membresias.js (costoPropio):
// tu parte = costo / personas redondeado a 2 decimales (mínimo 0.01) por suscripción.
const redondear2 = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

const costoPropio = (costo, personas) => {
  const total = Number(costo) || 0;
  if (total <= 0) return 0;
  return Math.max(0.01, redondear2(total / (Number(personas) || 1)));
};

// Gasto fijo mensual: suma de tu parte (anual / 12), redondeada al final.
const gastoFijoMensual = (rows) =>
  redondear2(
    rows.reduce((acc, row) => {
      const parte = costoPropio(row.costo, row.personas);
      return acc + (row.frecuencia === 'anual' ? parte / 12 : parte);
    }, 0)
  );

module.exports = { costoPropio, gastoFijoMensual };
