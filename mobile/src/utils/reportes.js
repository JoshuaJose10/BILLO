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

// Reparte el 100% entre montos positivos (en centavos) con `decimales` decimales (1 por defecto;
// 0 para enteros), sumando exactamente 100: cada uno baja a la unidad mínima (0.1 o 1) y las que
// sobran van a los de mayor residuo. Ningún monto queda en 0: el mínimo es una unidad, descontada
// del mayor.
export function repartirPorcentajes(centavos, decimales = 1) {
  const escala = 10 ** decimales;
  const totalUnidades = 100 * escala;
  const suma = centavos.reduce((acc, c) => acc + c, 0);
  const exactas = centavos.map((c) => (c * totalUnidades) / suma);
  const unidades = exactas.map((e) => Math.max(1, Math.floor(e)));
  const resto = totalUnidades - unidades.reduce((acc, d) => acc + d, 0);

  if (resto < 0) {
    unidades[unidades.indexOf(Math.max(...unidades))] += resto;
  } else {
    exactas
      .map((e, i) => ({ i, residuo: e - Math.floor(e) }))
      .sort((a, b) => b.residuo - a.residuo)
      .slice(0, resto)
      .forEach(({ i }) => {
        unidades[i] += 1;
      });
  }
  return unidades.map((d) => d / escala);
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

// Paleta de fuentes de ingreso (oscuro / claro) con contraste en ambos temas.
const COLORES_FUENTES = {
  sueldo: { oscuro: '#10B981', claro: '#0FA372' },
  salario: { oscuro: '#10B981', claro: '#0FA372' },
  freelance: { oscuro: '#3B82F6', claro: '#2563EB' },
  beca: { oscuro: '#8B5CF6', claro: '#7C3AED' },
  'aguinaldo/bono': { oscuro: '#F59E0B', claro: '#D97706' },
  ventas: { oscuro: '#06B6D4', claro: '#0891B2' },
  inversiones: { oscuro: '#EC4899', claro: '#DB2777' },
  renta: { oscuro: '#6366F1', claro: '#4F46E5' },
  regalo: { oscuro: '#F472B6', claro: '#E11D48' },
  reembolso: { oscuro: '#14B8A6', claro: '#0D9488' },
  otro: { oscuro: '#8E8E93', claro: '#7C7C82' },
  'sin fuente': { oscuro: '#8E8E93', claro: '#7C7C82' },
};

const PALETA_FUENTES_RESPALDO = [
  { oscuro: '#10B981', claro: '#0FA372' },
  { oscuro: '#3B82F6', claro: '#2563EB' },
  { oscuro: '#8B5CF6', claro: '#7C3AED' },
  { oscuro: '#F59E0B', claro: '#D97706' },
  { oscuro: '#06B6D4', claro: '#0891B2' },
  { oscuro: '#EC4899', claro: '#DB2777' },
  { oscuro: '#14B8A6', claro: '#0D9488' },
];

export function colorFuenteIngreso(fuente, esOscuro = true) {
  const clave = String(fuente ?? '')
    .trim()
    .toLowerCase();
  const directo = COLORES_FUENTES[clave];
  if (directo) return esOscuro ? directo.oscuro : directo.claro;
  if (!clave) {
    const neutro = COLORES_FUENTES.otro;
    return esOscuro ? neutro.oscuro : neutro.claro;
  }
  let hash = 0;
  for (let i = 0; i < clave.length; i += 1) {
    hash = (hash * 31 + clave.charCodeAt(i)) >>> 0;
  }
  const par = PALETA_FUENTES_RESPALDO[hash % PALETA_FUENTES_RESPALDO.length];
  return esOscuro ? par.oscuro : par.claro;
}

// GET /reportes/ingresos → { mes, total, por_fuente, mes_anterior, total_mes_anterior, variacion, variacion_porcentaje }
export function normalizarReporteIngresos(reporte, mes) {
  const porFuente = Array.isArray(reporte?.por_fuente)
    ? reporte.por_fuente.map((f) => ({
        fuente: String(f?.fuente ?? '').trim() || 'Sin fuente',
        total: numero(f?.total),
        porcentaje: numero(f?.porcentaje),
      }))
    : [];
  return {
    mes: reporte?.mes ?? mes ?? null,
    total: numero(reporte?.total),
    por_fuente: porFuente,
    mes_anterior: reporte?.mes_anterior ?? null,
    total_mes_anterior: numero(reporte?.total_mes_anterior),
    variacion: numero(reporte?.variacion),
    variacion_porcentaje: numero(reporte?.variacion_porcentaje),
  };
}

// Datos de la dona de ingresos a partir de `por_fuente`:
// [{ id, value, color, etiqueta, porcentaje }].
export function armarDatosDonaIngresos(porFuente, esOscuro = true) {
  const conMonto = (porFuente || [])
    .map((f) => ({
      fuente: String(f?.fuente ?? '').trim() || 'Sin fuente',
      total: numero(f?.total),
      centavos: Math.round(numero(f?.total) * 100),
    }))
    .filter((f) => f.centavos > 0);
  if (conMonto.length === 0) return [];

  const porcentajes = repartirPorcentajes(conMonto.map((f) => f.centavos));
  return conMonto.map((f, i) => ({
    id: f.fuente,
    value: f.total,
    color: colorFuenteIngreso(f.fuente, esOscuro),
    etiqueta: f.fuente,
    porcentaje: porcentajes[i],
  }));
}

export function descripcionDonaIngresos(datos) {
  const partes = (datos || []).map((d) => `${d.etiqueta} ${formatearPorcentaje(d.porcentaje)}`);
  return `Gráfica de ingresos por fuente: ${partes.join(', ')}`;
}

// GET /reportes/balance → { mes, ingresos, gasto_variable, gasto_fijo, gastos, balance, serie }
export function normalizarBalance(reporte, mes) {
  const serie = Array.isArray(reporte?.serie)
    ? reporte.serie.map((item) => ({
        mes: item?.mes ?? null,
        ingresos: numero(item?.ingresos),
        gasto_variable: numero(item?.gasto_variable),
        gasto_fijo: numero(item?.gasto_fijo),
        gastos: numero(item?.gastos),
        balance: numero(item?.balance),
      }))
    : [];
  return {
    mes: reporte?.mes ?? mes ?? null,
    ingresos: numero(reporte?.ingresos),
    gasto_variable: numero(reporte?.gasto_variable),
    gasto_fijo: numero(reporte?.gasto_fijo),
    gastos: numero(reporte?.gastos),
    balance: numero(reporte?.balance),
    serie,
  };
}

export function estadoBalanceMes(balance) {
  const n = numero(balance);
  if (n > 0) return 'positivo';
  if (n < 0) return 'negativo';
  return 'neutro';
}

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

// Arma las barras comparativas de los últimos 6 meses para la vista Balance.
export function armarBarrasBalance(serie) {
  const filas = Array.isArray(serie) ? serie : [];
  if (filas.length === 0) return [];
  const maximo = filas.reduce(
    (max, item) => Math.max(max, numero(item?.ingresos), numero(item?.gastos)),
    0,
  );
  return filas.map((item) => {
    const mes = String(item?.mes ?? '');
    const indiceMes = Number(mes.slice(5, 7)) - 1;
    const etiqueta = MESES_CORTOS[indiceMes] || mes;
    const ingresos = numero(item?.ingresos);
    const gastos = numero(item?.gastos);
    const balance = numero(item?.balance);
    return {
      mes,
      etiqueta,
      ingresos,
      gastos,
      balance,
      fraccionIngresos: maximo > 0 ? Math.min(Math.max(ingresos / maximo, 0), 1) : 0,
      fraccionGastos: maximo > 0 ? Math.min(Math.max(gastos / maximo, 0), 0 + 1) : 0,
      estadoBalance: estadoBalanceMes(balance),
    };
  });
}
