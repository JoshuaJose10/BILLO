// Normalización de los reportes (RF6, RF8; docs/api-contrato.md, "Reportes"). Los montos pueden
// llegar como texto (NUMERIC de Postgres); aquí se pasan a número. Sin imports para poder
// probarlo con node --test.

const numero = (valor) => {
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
};

// GET /reportes/resumen → { mes, gasto_variable, gasto_fijo, total } con montos numéricos.
// Una respuesta vacía (null) cuenta como mes en ceros.
export function normalizarResumen(resumen, mes) {
  return {
    mes: resumen?.mes ?? mes ?? null,
    gasto_variable: numero(resumen?.gasto_variable),
    gasto_fijo: numero(resumen?.gasto_fijo),
    total: numero(resumen?.total),
  };
}

// GET /reportes/por-categoria → [{ categoria_id, categoria, total, porcentaje }] con números.
export function normalizarPorCategoria(lista) {
  return (lista || []).map((c) => ({
    ...c,
    total: numero(c.total),
    porcentaje: numero(c.porcentaje),
  }));
}
