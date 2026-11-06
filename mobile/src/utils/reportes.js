import { colorCategoria } from '../theme/categorias.js';

// Normalización de los reportes (RF6, RF8; docs/api-contrato.md, "Reportes") y datos de la dona de
// la pantalla de Reportes. Los montos pueden llegar como texto (NUMERIC de Postgres); aquí se pasan
// a número. Sin imports de React Native para poder probarlo con node --test.

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

// Reparte el 100% entre montos positivos (en centavos) con un decimal, sumando exactamente 100:
// cada uno baja a la décima y las décimas que sobran van a los de mayor residuo. Ningún monto queda
// en 0.0: el mínimo es 0.1, descontado del mayor.
function repartirPorcentajes(centavos) {
  const suma = centavos.reduce((acc, c) => acc + c, 0);
  const exactas = centavos.map((c) => (c * 1000) / suma);
  const decimas = exactas.map((e) => Math.max(1, Math.floor(e)));
  const resto = 1000 - decimas.reduce((acc, d) => acc + d, 0);

  if (resto < 0) {
    decimas[decimas.indexOf(Math.max(...decimas))] += resto;
  } else {
    exactas
      .map((e, i) => ({ i, residuo: e - Math.floor(e) }))
      .sort((a, b) => b.residuo - a.residuo)
      .slice(0, resto)
      .forEach(({ i }) => {
        decimas[i] += 1;
      });
  }
  return decimas.map((d) => d / 10);
}

// Datos de la dona a partir de normalizarPorCategoria, en el mismo orden (de mayor a menor):
// [{ id, value, color, etiqueta, porcentaje }]. `value` y `color` son los campos que lee PieChart.
// `esOscuro` es el del tema activo. El porcentaje se calcula con los totales porque el de la API es
// entero: una categoría de 0.4% llegaría como 0. Las categorías sin monto no generan rebanada.
export function armarDatosDona(categorias, esOscuro) {
  const conMonto = (categorias || [])
    .map((c) => ({ ...c, centavos: Math.round(numero(c.total) * 100) }))
    .filter((c) => c.centavos > 0);
  if (conMonto.length === 0) return [];

  const porcentajes = repartirPorcentajes(conMonto.map((c) => c.centavos));
  return conMonto.map((c, i) => ({
    id: c.categoria_id,
    value: numero(c.total),
    color: colorCategoria(c.categoria, esOscuro),
    etiqueta: c.categoria,
    porcentaje: porcentajes[i],
  }));
}

// Mes sin nada que reportar: total en 0 y sin categorías. Con membresías el total no es 0 aunque no
// haya gastos, así que ese mes no cuenta como vacío.
export function esMesSinDatos(resumen, categorias) {
  return numero(resumen?.total) === 0 && (categorias || []).length === 0;
}

// 33.33 → "33.3 %", 60 → "60 %", 0.4 → "0.4 %".
export function formatearPorcentaje(valor) {
  return `${Number(numero(valor).toFixed(1))} %`;
}

// Resumen en texto de la dona para lectores de pantalla.
export function descripcionDona(datos) {
  const partes = (datos || []).map((d) => `${d.etiqueta} ${formatearPorcentaje(d.porcentaje)}`);
  return `Gráfica de gasto por categoría: ${partes.join(', ')}`;
}
