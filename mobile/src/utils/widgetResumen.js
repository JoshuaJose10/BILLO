import { colorCategoria } from '../theme/categorias.js';
import { arcosDona } from './dona.js';
import {
  calcularDiasParaCobro,
  estiloServicio,
  proximoCobro,
  textoProximoCobro,
} from './membresias.js';
import { repartirPorcentajes } from './reportes.js';

// Datos y modelos de vista de los 4 widgets de Android (HU-58 / RF13 y feature/widgets-billo):
// - ResumenMes («Resumen del mes»)
// - BalanceMes («Balance del mes»)
// - DonaCategorias («Dona por categoría»)
// - ProximoCobro («Próximo cobro»)
// Sin imports de React Native para poder probarlo con node --test.

const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];

const MESES_CORTOS = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
];

const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const formatoMonedaSinDecimales = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export const TEXTO_SIN_DATOS = 'Abre Billo';
export const MAX_SEGMENTOS_DONA_WIDGET = 5;

export const NOMBRES_WIDGETS = ['ResumenMes', 'BalanceMes', 'DonaCategorias', 'ProximoCobro'];

export const URIS_WIDGETS = {
  ResumenMes: 'billo://inicio',
  BalanceMes: 'billo://balance',
  DonaCategorias: 'billo://dona',
  ProximoCobro: 'billo://cobro',
};

const redondear2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function formatearCompacto(monto) {
  const num = Number(monto) || 0;
  if (Math.abs(num) >= 10000) return formatoMonedaSinDecimales.format(Math.round(num));
  return formatoMoneda.format(num);
}

// Agrupa los gastos o categorías del mes de mayor a menor en máximo 5 segmentos; si hay más de 5
// categorías con gasto, las primeras 4 se conservan y el resto se agrupa en «Otras».
export function agruparCategoriasWidget(
  gastosOCategorias = [],
  nombresCategoria = {},
  maxSegmentos = MAX_SEGMENTOS_DONA_WIDGET,
) {
  const porNombre = new Map();
  const resolverNombre = (id) =>
    typeof nombresCategoria === 'function' ? nombresCategoria(id) : nombresCategoria?.[id];

  for (const item of gastosOCategorias || []) {
    if (!item) continue;
    const monto = Number(item.total ?? item.monto);
    if (!Number.isFinite(monto) || monto <= 0) continue;
    const nombre =
      (typeof item.nombre === 'string' && item.nombre.trim()) ||
      (typeof item.categoria === 'string' && item.categoria.trim()) ||
      resolverNombre(item.categoria_id) ||
      'Sin categoría';
    porNombre.set(nombre, redondear2((porNombre.get(nombre) || 0) + monto));
  }

  const ordenadas = [...porNombre.entries()]
    .map(([nombre, total]) => ({ nombre, total }))
    .filter((f) => f.total > 0)
    .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'));

  if (ordenadas.length === 0) return [];

  let segmentos = ordenadas;
  if (ordenadas.length > maxSegmentos) {
    const principales = ordenadas.slice(0, maxSegmentos - 1);
    const resto = ordenadas.slice(maxSegmentos - 1);
    const totalOtras = redondear2(resto.reduce((acc, f) => acc + f.total, 0));
    segmentos = [...principales, { nombre: 'Otras', total: totalOtras, esOtras: true }];
  }

  const porcentajes = repartirPorcentajes(
    segmentos.map((s) => Math.round(s.total * 100)),
    0,
  );

  return segmentos.map((s, i) => ({
    nombre: s.nombre,
    total: s.total,
    porcentaje: porcentajes[i],
    ...(s.esOtras ? { esOtras: true } : {}),
  }));
}

// GET /reportes/resumen (o instantánea completa de Inicio) → dato que se guarda para los widgets.
// Conserva compatibilidad exacta con `{ mes, total }` cuando solo se pasa el resumen.
export function crearDatoWidget(entrada, mes) {
  if (!entrada || typeof entrada !== 'object') return null;

  // Caso extendido: se pasa `{ resumen, gastos, ingresos, membresias, nombresCategoria }`
  const resumenFuente =
    entrada.resumen && typeof entrada.resumen === 'object' ? entrada.resumen : entrada;
  const total = Number(resumenFuente?.total);
  const mesDato = resumenFuente?.mes ?? entrada?.mes ?? mes;
  if (!Number.isFinite(total) || !/^\d{4}-\d{2}$/.test(mesDato ?? '')) return null;

  const tieneExtras =
    entrada.resumen != null ||
    entrada.gastos != null ||
    entrada.ingresos != null ||
    entrada.membresias != null ||
    entrada.categorias != null ||
    entrada.proximo_cobro !== undefined ||
    entrada.balance != null;

  if (!tieneExtras) {
    return { mes: mesDato, total: redondear2(total) };
  }

  const gastoVariable = Number.isFinite(Number(resumenFuente?.gasto_variable))
    ? redondear2(resumenFuente.gasto_variable)
    : redondear2(total);
  const gastoFijo = Number.isFinite(Number(resumenFuente?.gasto_fijo))
    ? redondear2(resumenFuente.gasto_fijo)
    : 0;

  let ingresosTotal = 0;
  if (Array.isArray(entrada.ingresos)) {
    ingresosTotal = redondear2(
      entrada.ingresos.reduce((acc, i) => acc + (Number(i?.monto) || 0), 0),
    );
  } else if (Number.isFinite(Number(entrada.ingresos))) {
    ingresosTotal = redondear2(entrada.ingresos);
  }

  const gastosTotal = Number.isFinite(Number(entrada.gastos))
    ? redondear2(entrada.gastos)
    : redondear2(total);

  const balanceTotal = Number.isFinite(Number(entrada.balance))
    ? redondear2(entrada.balance)
    : redondear2(ingresosTotal - gastosTotal);

  const categorias = Array.isArray(entrada.categorias)
    ? agruparCategoriasWidget(entrada.categorias)
    : Array.isArray(entrada.gastos)
      ? agruparCategoriasWidget(entrada.gastos, entrada.nombresCategoria)
      : [];

  let cobro = null;
  if (entrada.proximo_cobro && typeof entrada.proximo_cobro === 'object') {
    const c = entrada.proximo_cobro;
    if (c.nombre && Number.isFinite(Number(c.costo))) {
      cobro = {
        id: c.id ?? 1,
        nombre: String(c.nombre),
        costo: redondear2(c.costo),
        frecuencia: c.frecuencia || 'mensual',
        fecha_cobro: c.fecha_cobro || null,
        dias_para_cobro: Number.isFinite(Number(c.dias_para_cobro)) ? Number(c.dias_para_cobro) : 0,
      };
    }
  } else if (Array.isArray(entrada.membresias)) {
    const resultado = proximoCobro(entrada.membresias);
    const sig = resultado?.membresia ?? resultado;
    if (sig && sig.nombre) {
      cobro = {
        id: sig.id ?? 1,
        nombre: String(sig.nombre),
        costo: redondear2(sig.costo),
        frecuencia: sig.frecuencia || 'mensual',
        fecha_cobro: sig.fecha_cobro || null,
        dias_para_cobro: Number(resultado?.dias ?? sig.dias_para_cobro) || 0,
      };
    }
  }

  return {
    mes: mesDato,
    total: redondear2(total),
    gasto_variable: gastoVariable,
    gasto_fijo: gastoFijo,
    ingresos: ingresosTotal,
    gastos: gastosTotal,
    balance: balanceTotal,
    categorias,
    proximo_cobro: cobro,
  };
}

// Lee lo guardado (texto JSON) sin fallar con datos dañados.
export function leerDatoGuardado(texto) {
  if (!texto) return null;
  try {
    const dato = JSON.parse(texto);
    return crearDatoWidget(dato, dato?.mes);
  } catch {
    return null;
  }
}

// 1. Resumen del mes: { titulo, monto } o { titulo, monto: null } («Abre Billo»)
export function textoWidget(dato, mesActual) {
  if (!dato || dato.mes !== mesActual) return { titulo: 'BILLO', monto: null };
  return {
    titulo: `BILLO · ${MESES[Number(dato.mes.slice(5, 7)) - 1]}`,
    monto: formatoMoneda.format(dato.total),
  };
}

// 2. Balance del mes: ingresos, gastos y balance (positivo → verde, negativo → rojo)
export function datosBalanceWidget(dato, mesActual) {
  if (!dato || dato.mes !== mesActual) {
    return {
      vacio: true,
      titulo: 'BILLO · BALANCE',
      textoVacio: TEXTO_SIN_DATOS,
    };
  }
  const indiceMes = Number(dato.mes.slice(5, 7)) - 1;
  const ingresosNum = Number(dato.ingresos) || 0;
  const gastosNum = Number(dato.gastos ?? dato.total) || 0;
  const balanceNum =
    dato.balance != null ? Number(dato.balance) : redondear2(ingresosNum - gastosNum);
  const estado = balanceNum > 0 ? 'positivo' : balanceNum < 0 ? 'negativo' : 'neutro';
  const signo = balanceNum > 0 ? '+' : balanceNum < 0 ? '−' : '';

  return {
    vacio: false,
    titulo: `BALANCE · ${MESES[indiceMes]}`,
    mesCorto: MESES_CORTOS[indiceMes],
    ingresos: `+${formatearCompacto(ingresosNum)}`,
    gastos: `-${formatearCompacto(gastosNum)}`,
    balance: `${signo}${formatoMoneda.format(Math.abs(balanceNum))}`,
    balanceCompacto: `${signo}${formatearCompacto(Math.abs(balanceNum))}`,
    estado,
  };
}

// Genera el SVG de la dona para SvgWidget (react-native-android-widget).
export function generarSvgDonaWidget(
  segmentos,
  { esOscuro = true, lado = 92, grosor = 12, separacion = 5 } = {},
) {
  const centro = lado / 2;
  const radio = centro - grosor / 2 - 2;
  const circunferencia = 2 * Math.PI * radio;
  const colorPista = esOscuro ? 'rgba(255, 255, 255, 0.10)' : 'rgba(17, 17, 20, 0.08)';
  const valores = (segmentos || []).map((s) => Number(s.total) || 0).filter((v) => v > 0);

  if (valores.length === 0) {
    return `<svg width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}" xmlns="http://www.w3.org/2000/svg"><circle cx="${centro}" cy="${centro}" r="${radio}" fill="none" stroke="${colorPista}" stroke-width="${grosor}"/></svg>`;
  }

  const arcos = arcosDona(valores, { radio, grosor, separacion });
  const trazos = arcos
    .map((arco) => {
      const seg = segmentos[arco.indice];
      const color =
        seg?.color || colorCategoria(seg?.nombre === 'Otras' ? 'Otros' : seg?.nombre, esOscuro);
      const largo = arco.completo
        ? circunferencia
        : arco.punto
          ? 0.5
          : (arco.barrido / 360) * circunferencia;
      const linecap = arco.completo ? 'butt' : 'round';
      const rotacion = Number((arco.inicio - 90).toFixed(2));
      return `<circle cx="${centro}" cy="${centro}" r="${radio}" fill="none" stroke="${color}" stroke-width="${grosor}" stroke-linecap="${linecap}" stroke-dasharray="${largo.toFixed(2)} ${circunferencia.toFixed(2)}" transform="rotate(${rotacion} ${centro} ${centro})"/>`;
    })
    .join('');

  return `<svg width="${lado}" height="${lado}" viewBox="0 0 ${lado} ${lado}" xmlns="http://www.w3.org/2000/svg"><circle cx="${centro}" cy="${centro}" r="${radio}" fill="none" stroke="${colorPista}" stroke-width="${grosor}"/>${trazos}</svg>`;
}

// 3. Dona por categoría: máximo 5 segmentos y «Otras», con el total al centro.
export function datosDonaWidget(dato, mesActual, esOscuro = true) {
  if (!dato || dato.mes !== mesActual) {
    return {
      vacio: true,
      titulo: 'BILLO · CATEGORÍAS',
      textoVacio: TEXTO_SIN_DATOS,
      segmentos: [],
      svg: null,
    };
  }
  const indiceMes = Number(dato.mes.slice(5, 7)) - 1;
  const baseCategorias = agruparCategoriasWidget(dato.categorias || []);
  const segmentos = baseCategorias.map((c) => ({
    ...c,
    color: colorCategoria(c.nombre === 'Otras' ? 'Otros' : c.nombre, esOscuro),
    montoTexto: formatearCompacto(c.total),
  }));
  const sumaCategorias = redondear2(segmentos.reduce((s, c) => s + c.total, 0));
  const totalMes =
    sumaCategorias > 0 ? sumaCategorias : Number(dato.gasto_variable ?? dato.total) || 0;

  return {
    vacio: false,
    titulo: `CATEGORÍAS · ${MESES[indiceMes]}`,
    mesCorto: MESES_CORTOS[indiceMes],
    total: formatoMoneda.format(totalMes),
    totalCompacto: formatearCompacto(totalMes),
    segmentos,
    svg: generarSvgDonaWidget(segmentos, { esOscuro }),
  };
}

// 4. Próximo cobro: servicio, monto y días que faltan para el siguiente cobro.
export function datosProximoCobroWidget(dato, hoyISO = null) {
  const cobro = dato?.proximo_cobro;
  if (!dato || !cobro || !cobro.nombre) {
    return {
      vacio: true,
      titulo: 'PRÓXIMO COBRO',
      textoVacio: TEXTO_SIN_DATOS,
    };
  }

  const dias =
    hoyISO && cobro.fecha_cobro
      ? calcularDiasParaCobro(cobro.fecha_cobro, hoyISO)
      : Number(cobro.dias_para_cobro) || 0;
  const estilo = estiloServicio(cobro.nombre);
  const textoDias = textoProximoCobro(dias);
  const cuando = textoDias.charAt(0).toUpperCase() + textoDias.slice(1);

  return {
    vacio: false,
    titulo: 'PRÓXIMO COBRO',
    servicio: cobro.nombre,
    monto: formatoMoneda.format(Number(cobro.costo) || 0),
    montoCompacto: formatearCompacto(Number(cobro.costo) || 0),
    dias,
    cuando,
    urgente: dias <= 3,
    colorMarca: estilo.color,
    inicial: (cobro.nombre || 'S').trim().charAt(0).toUpperCase(),
  };
}

// Destino de navegación dentro de la app al tocar cada widget.
export function destinoWidget(entrada) {
  const valor = String(entrada ?? '').trim();
  if (!valor) return null;
  if (valor === 'ResumenMes' || valor.startsWith('billo://inicio')) {
    return { screen: 'Inicio', params: undefined };
  }
  if (valor === 'BalanceMes' || valor.startsWith('billo://balance')) {
    return { screen: 'Reportes', params: { vista: 'balance' } };
  }
  if (valor === 'DonaCategorias' || valor.startsWith('billo://dona')) {
    return { screen: 'Reportes', params: { vista: 'gastos' } };
  }
  if (valor === 'ProximoCobro' || valor.startsWith('billo://cobro')) {
    return { screen: 'Cartera', params: { seccion: 'suscripciones' } };
  }
  return null;
}
