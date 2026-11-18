// Datos de los widgets de Android (HU-58 / RF13 y feature/widgets-billo). Sin imports de React
// Native para poder probarlo con node --test. La app guarda el dato al cargar Inicio y los widgets
// lo dibujan sin red.
import { colorCategoria } from '../theme/categorias.js';
import { arcosDona } from './dona.js';
import { formatearMonto, formatearMontoCorto, MONEDA, partesMonto } from './formato.js';
import { saldoDelMes, totalIngresos } from './ingresos.js';
import { estiloServicio, proximoCobro, textoProximoCobro } from './membresias.js';
import { repartirPorcentajes } from './reportes.js';
import { gastoPorCategoria } from './resumenMes.js';

export const TEXTO_SIN_DATOS = 'Abre Billo para ver tu saldo';
export const TEXTO_SIN_DATOS_CORTO = 'Abre Billo';
export const OCULTO = '••••';
export const MAX_SEGMENTOS_DONA_WIDGET = 5;

const TOP_CATEGORIAS = 3;
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

export const NOMBRES_WIDGETS = [
  'ResumenMes',
  'RegistrarVoz',
  'BalanceMes',
  'DonaCategorias',
  'ProximoCobro',
];

export const URIS_WIDGETS = {
  ResumenMes: 'billo://inicio',
  BalanceMes: 'billo://balance',
  DonaCategorias: 'billo://dona',
  ProximoCobro: 'billo://cobro',
};

const esNumero = (n) => typeof n === 'number' && Number.isFinite(n);
const redondear2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

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

  return segmentos.map((s, i) => {
    const claveColor = s.nombre === 'Otras' ? 'Otros' : s.nombre;
    return {
      nombre: s.nombre,
      total: s.total,
      porcentaje: porcentajes[i],
      claro: colorCategoria(claveColor, false),
      oscuro: colorCategoria(claveColor, true),
      ...(s.esOtras ? { esOtras: true } : {}),
    };
  });
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
        seg?.color ||
        (esOscuro ? seg?.oscuro : seg?.claro) ||
        colorCategoria(seg?.nombre === 'Otras' ? 'Otros' : seg?.nombre, esOscuro);
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

// Lo mismo que muestra Inicio → dato que se guarda:
// { mes, saldo, ingresos, gastos, gasto_variable, categorias, dona, cobro }.
export function crearDatoWidget({ resumen, gastos, ingresos, membresias, categorias } = {}, mes) {
  if (!/^\d{4}-\d{2}$/.test(mes ?? '')) return null;
  const nombres = Object.fromEntries((categorias || []).map((c) => [c.id, c.nombre]));
  const proximo = proximoCobro(membresias);
  const porCat = gastoPorCategoria(gastos, nombres);
  const sumaGastos = redondear2(porCat.reduce((acc, c) => acc + c.total, 0));
  const gastoVariable = esNumero(Number(resumen?.gasto_variable))
    ? redondear2(resumen.gasto_variable)
    : sumaGastos;
  const gastosTotal = esNumero(Number(resumen?.total)) ? redondear2(resumen.total) : gastoVariable;

  return {
    mes,
    saldo: saldoDelMes(ingresos, resumen?.gasto_variable),
    ingresos: totalIngresos(ingresos),
    gastos: gastosTotal,
    gasto_variable: gastoVariable,
    categorias: porCat
      .filter((c) => c.nombre)
      .slice(0, TOP_CATEGORIAS)
      .map(({ nombre }) => ({
        nombre,
        claro: colorCategoria(nombre, false),
        oscuro: colorCategoria(nombre, true),
      })),
    dona: agruparCategoriasWidget(porCat),
    cobro: proximo
      ? {
          nombre: proximo.membresia.nombre,
          dias: proximo.dias,
          monto: Number(proximo.membresia.costo),
        }
      : null,
  };
}

// Lee lo guardado (texto JSON) sin fallar con datos dañados o de una versión anterior.
export function leerDatoGuardado(texto) {
  if (!texto) return null;
  try {
    const dato = JSON.parse(texto);
    const valido =
      /^\d{4}-\d{2}$/.test(dato?.mes ?? '') &&
      (dato.saldo === null || esNumero(dato.saldo)) &&
      esNumero(dato.ingresos) &&
      Array.isArray(dato.categorias);
    return valido ? dato : null;
  } catch {
    return null;
  }
}

// Modelo para el widget «Balance del mes»: ingresos, gastos y balance (positivo → verde, negativo → rojo).
export function datosBalanceWidget(dato, mesActual, oculto = false) {
  if (!dato || dato.mes !== mesActual) {
    return {
      vacio: true,
      titulo: 'BILLO · BALANCE',
      textoVacio: TEXTO_SIN_DATOS_CORTO,
    };
  }
  const indiceMes = Number(dato.mes.slice(5, 7)) - 1;
  const ingresosNum = Number(dato.ingresos) || 0;
  const gastosNum = Number(dato.gastos ?? dato.gasto_variable ?? 0) || 0;
  const balanceNum =
    dato.balance != null ? Number(dato.balance) : redondear2(ingresosNum - gastosNum);
  const estado = balanceNum > 0 ? 'positivo' : balanceNum < 0 ? 'negativo' : 'neutro';
  const signo = balanceNum > 0 ? '+' : balanceNum < 0 ? '−' : '';

  if (oculto) {
    return {
      vacio: false,
      titulo: `BALANCE · ${MESES[indiceMes]}`,
      mesCorto: MESES_CORTOS[indiceMes],
      ingresos: OCULTO,
      gastos: OCULTO,
      balance: OCULTO,
      balanceCompacto: OCULTO,
      estado: 'neutro',
    };
  }

  return {
    vacio: false,
    titulo: `BALANCE · ${MESES[indiceMes]}`,
    mesCorto: MESES_CORTOS[indiceMes],
    ingresos: `+${formatearMontoCorto(ingresosNum)}`,
    gastos: `-${formatearMontoCorto(gastosNum)}`,
    balance: `${signo}${formatearMonto(Math.abs(balanceNum))}`,
    balanceCompacto: `${signo}${formatearMontoCorto(Math.abs(balanceNum))}`,
    estado,
  };
}

// Modelo para el widget «Dona por categoría»: máximo 5 segmentos y «Otras», con el total al centro.
export function datosDonaWidget(dato, mesActual, esOscuro = true) {
  if (!dato || dato.mes !== mesActual) {
    return {
      vacio: true,
      titulo: 'BILLO · CATEGORÍAS',
      textoVacio: TEXTO_SIN_DATOS_CORTO,
      segmentos: [],
      svg: null,
    };
  }
  const indiceMes = Number(dato.mes.slice(5, 7)) - 1;
  const baseCategorias = agruparCategoriasWidget(dato.dona ?? dato.categorias ?? []);
  const segmentos = baseCategorias.map((c) => ({
    ...c,
    color: esOscuro ? c.oscuro : c.claro,
    montoTexto: formatearMontoCorto(c.total),
  }));
  const sumaCategorias = redondear2(segmentos.reduce((s, c) => s + c.total, 0));
  const totalMes =
    sumaCategorias > 0 ? sumaCategorias : Number(dato.gasto_variable ?? dato.gastos ?? 0) || 0;

  return {
    vacio: false,
    titulo: `CATEGORÍAS · ${MESES[indiceMes]}`,
    mesCorto: MESES_CORTOS[indiceMes],
    total: formatearMonto(totalMes),
    totalCompacto: formatearMontoCorto(totalMes),
    segmentos,
    svg: generarSvgDonaWidget(segmentos, { esOscuro }),
  };
}

// Modelo para el widget «Próximo cobro»: servicio, monto y días que faltan para el siguiente cobro.
export function datosProximoCobroWidget(dato) {
  const cobro = dato?.cobro ?? dato?.proximo_cobro;
  if (!dato || !cobro || !cobro.nombre) {
    return {
      vacio: true,
      titulo: 'PRÓXIMO COBRO',
      textoVacio: TEXTO_SIN_DATOS_CORTO,
    };
  }
  const dias = Number(cobro.dias ?? cobro.dias_para_cobro) || 0;
  const montoNum = Number(cobro.monto ?? cobro.costo) || 0;
  const estilo = estiloServicio(cobro.nombre);
  const textoDias = textoProximoCobro(dias);
  const cuando = textoDias.charAt(0).toUpperCase() + textoDias.slice(1);

  return {
    vacio: false,
    titulo: 'PRÓXIMO COBRO',
    servicio: cobro.nombre,
    monto: formatearMonto(montoNum),
    montoCompacto: `${formatearMontoCorto(montoNum)} ${MONEDA}`,
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

// Qué dibuja el widget, o null («Abre Billo para ver tu saldo») sin dato o si es de otro mes.
// Con `oculto` (ojito de Inicio, HU-82) el saldo es «••••» y no se muestran los ingresos.
//   { saldo: { entero, centavos } | null, ingresos: '+$X' | null, categorias, cobro: { texto, monto } | null, balance, donaClaro, donaOscuro, proximoCobro }
export function vistaWidget(dato, mesActual, oculto) {
  if (!dato || dato.mes !== mesActual) return null;
  let saldo = null;
  if (oculto) {
    saldo = { entero: OCULTO, centavos: '' };
  } else if (esNumero(dato.saldo)) {
    const partes = partesMonto(Math.abs(dato.saldo));
    saldo = { ...partes, entero: dato.saldo < 0 ? `−${partes.entero}` : partes.entero };
  }
  return {
    saldo,
    ingresos: !oculto && dato.ingresos > 0 ? `+${formatearMontoCorto(dato.ingresos)}` : null,
    categorias: dato.categorias,
    cobro: dato.cobro
      ? {
          texto: `${dato.cobro.nombre} ${textoProximoCobro(dato.cobro.dias).toLowerCase()}`,
          monto: `${formatearMontoCorto(dato.cobro.monto)} ${MONEDA}`,
        }
      : null,
    balance: datosBalanceWidget(dato, mesActual, oculto),
    donaClaro: datosDonaWidget(dato, mesActual, false),
    donaOscuro: datosDonaWidget(dato, mesActual, true),
    proximoCobro: datosProximoCobroWidget(dato),
  };
}
