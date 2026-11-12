// Reglas de negocio y utilidades para Membresías / Suscripciones (RF5)
// Sin dependencias de React Native para compatibilidad directa con Metro y node --test.

import { coloresServicio } from '../theme/servicios.js';

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

export function formatearDiaMes(fechaStr) {
  if (!fechaStr || typeof fechaStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return '';
  }
  const [, mes, dia] = fechaStr.split('-').map(Number);
  const nombreMes = MESES_CORTOS[mes - 1] || '';
  return `${dia} ${nombreMes}`.trim();
}

const SERVICIOS_PREDEFINIDOS = [
  { match: /netflix/i, color: coloresServicio.netflix, icono: 'movie-open' },
  { match: /spotify/i, color: coloresServicio.spotify, icono: 'spotify' },
  { match: /youtube/i, color: coloresServicio.youtube, icono: 'youtube' },
  { match: /apple music/i, color: coloresServicio.appleMusic, icono: 'apple' },
  { match: /apple (tv|one)/i, color: coloresServicio.appleTv, icono: 'apple' },
  { match: /disney/i, color: coloresServicio.disney, icono: 'movie-play' },
  { match: /hbo|max/i, color: coloresServicio.hbo, icono: 'television-play' },
  { match: /prime|amazon/i, color: coloresServicio.prime, icono: 'video' },
  { match: /xbox|game pass/i, color: coloresServicio.xbox, icono: 'microsoft-xbox' },
  { match: /playstation/i, color: coloresServicio.playstation, icono: 'controller' },
  { match: /paramount/i, color: coloresServicio.paramount, icono: 'movie' },
  { match: /crunchyroll/i, color: coloresServicio.crunchyroll, icono: 'play-box' },
  { match: /duolingo/i, color: coloresServicio.duolingo, icono: 'translate' },
  { match: /microsoft|office/i, color: coloresServicio.microsoft, icono: 'microsoft-office' },
  { match: /vix/i, color: coloresServicio.vix, icono: 'television' },
  { match: /mubi/i, color: coloresServicio.mubi, icono: 'filmstrip' },
  { match: /canva/i, color: coloresServicio.canva, icono: 'palette' },
  { match: /chatgpt/i, color: coloresServicio.chatgpt, icono: 'robot' },
  { match: /google/i, color: coloresServicio.google, icono: 'google-cloud' },
  { match: /icloud/i, color: coloresServicio.icloud, icono: 'apple-icloud' },
];

const DEFAULT_SERVICIO = {
  color: coloresServicio.defecto,
  icono: 'calendar-sync',
};

// Obtiene el color e ícono distintivo de una membresía según su nombre.
// `predefinido` es false cuando no hay ícono propio: el catálogo muestra la inicial (HU-80).
export function estiloServicio(nombre = '') {
  const encontrado = SERVICIOS_PREDEFINIDOS.find((s) => s.match.test(nombre || ''));
  return encontrado
    ? { color: encontrado.color, icono: encontrado.icono, predefinido: true }
    : { ...DEFAULT_SERVICIO, predefinido: false };
}

// Inicial del servicio en mayúscula ('?' sin nombre): respaldo cuando no hay logo/ícono propio.
export function inicialServicio(nombre) {
  const texto = typeof nombre === 'string' ? nombre.trim() : '';
  return texto ? texto[0].toLocaleUpperCase('es') : '?';
}

// Suma el gasto fijo mensual: membresías mensuales aportan su costo completo,
// anuales se dividen entre 12. Las membresías pausadas no cuentan (HU-75). Redondeado a 2 decimales.
export function calcularTotalMensual(membresias = []) {
  if (!Array.isArray(membresias) || membresias.length === 0) return 0;
  const suma = membresias.reduce((total, m) => {
    if (m?.estado === 'pausada') return total;
    const costo = Number(m?.costo) || 0;
    if (m?.frecuencia === 'anual') {
      return total + costo / 12;
    }
    return total + costo;
  }, 0);
  return Math.round(suma * 100) / 100;
}

// Costo mensual de una membresía: las anuales se reparten en 12 meses.
const costoMensual = (m) => {
  if (m?.estado === 'pausada') return 0;
  const costo = Number(m?.costo) || 0;
  return m?.frecuencia === 'anual' ? costo / 12 : costo;
};

// Tramos de la barra "Total mensual" de Cartera (HU-81), para BarraCategorias:
// [{ id, nombre, fraccion, color }] con el color de marca de cada servicio, de mayor a menor costo
// mensual. Las fracciones suman 1 (la barra se llena: no hay límite como en presupuestos). Las
// membresías sin costo o pausadas no generan tramo.
export function tramosSuscripciones(membresias = []) {
  const conCosto = (Array.isArray(membresias) ? membresias : [])
    .filter((m) => m?.estado !== 'pausada')
    .map((m) => ({ m, mensual: costoMensual(m) }))
    .filter((x) => x.mensual > 0);
  const total = conCosto.reduce((suma, x) => suma + x.mensual, 0);
  if (total <= 0) return [];
  return conCosto
    .sort((a, b) => b.mensual - a.mensual)
    .map(({ m, mensual }) => ({
      id: m.id,
      nombre: m.nombre,
      fraccion: mensual / total,
      color: estiloServicio(m.nombre).color,
    }));
}

// Texto comparable para buscar: minúsculas, sin acentos ni espacios sobrantes.
export function normalizarBusqueda(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Buscador del catálogo de la hoja Nueva suscripción (HU-72). Ignora mayúsculas y acentos; cada
// palabra de la consulta debe aparecer en el nombre, que incluye el plan ("Spotify Duo"), así que
// "spo" deja los planes de Spotify y "duo spotify" también encuentra "Spotify Duo". Consulta vacía:
// el catálogo completo, en su orden.
export function filtrarCatalogo(catalogo = [], consulta = '') {
  const lista = Array.isArray(catalogo) ? catalogo : [];
  const palabras = normalizarBusqueda(consulta).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return lista;
  return lista.filter((item) => {
    const nombre = normalizarBusqueda(item?.nombre);
    return palabras.every((p) => nombre.includes(p));
  });
}

// Criterios para ordenar la lista de Suscripciones de Cartera (HU-72).
export const ORDEN_SUSCRIPCIONES = {
  fecha: 'fecha', // la más próxima primero (por defecto)
  costo: 'costo', // de mayor a menor costo mensual equivalente
  frecuencia: 'frecuencia', // secciones Mensuales y Anuales, cada una por fecha
};

const diasOrden = (m) =>
  typeof m?.dias_para_cobro === 'number' && !Number.isNaN(m.dias_para_cobro)
    ? m.dias_para_cobro
    : Infinity;

const porNombre = (a, b) => String(a?.nombre ?? '').localeCompare(String(b?.nombre ?? ''), 'es');

// Más próxima primero; sin fecha conocida, al final. Empates: por nombre.
const porFecha = (a, b) => {
  const da = diasOrden(a);
  const db = diasOrden(b);
  if (da !== db) return da === Infinity ? 1 : db === Infinity ? -1 : da - db;
  return porNombre(a, b);
};

// Copia ordenada de las membresías (no muta la original): 'fecha' o 'costo' (mensual equivalente,
// anual ÷ 12, de mayor a menor; empates por fecha y luego nombre).
export function ordenarMembresias(membresias = [], criterio = ORDEN_SUSCRIPCIONES.fecha) {
  const lista = Array.isArray(membresias) ? [...membresias] : [];
  if (criterio === ORDEN_SUSCRIPCIONES.costo) {
    return lista.sort((a, b) => costoMensual(b) - costoMensual(a) || porFecha(a, b));
  }
  return lista.sort(porFecha);
}

// Secciones "Mensuales" y "Anuales" (cada una por fecha), sin las vacías:
// [{ frecuencia, titulo, membresias }]. Sin frecuencia cuenta como mensual, igual que el total.
export function agruparPorFrecuencia(membresias = []) {
  const ordenadas = ordenarMembresias(membresias, ORDEN_SUSCRIPCIONES.fecha);
  return [
    { frecuencia: 'mensual', titulo: 'Mensuales' },
    { frecuencia: 'anual', titulo: 'Anuales' },
  ]
    .map((grupo) => ({
      ...grupo,
      membresias: ordenadas.filter(
        (m) => (m?.frecuencia === 'anual' ? 'anual' : 'mensual') === grupo.frecuencia,
      ),
    }))
    .filter((grupo) => grupo.membresias.length > 0);
}

// Tarjeta "Próximo cobro" de Inicio (HU-72): la membresía con la fecha de cobro más próxima
// (mismo orden que Cartera › Fecha) → { membresia, dias, mas }, donde `mas` cuenta las otras que
// cobran ese mismo día. Solo considera fechas conocidas, activas y no vencidas (HU-75); sin ninguna: null.
export function proximoCobro(membresias = []) {
  const activas = (Array.isArray(membresias) ? membresias : []).filter(
    (m) => m?.estado !== 'pausada',
  );
  const conFecha = ordenarMembresias(activas, ORDEN_SUSCRIPCIONES.fecha).filter(
    (m) => diasOrden(m) !== Infinity && m.dias_para_cobro >= 0,
  );
  if (conFecha.length === 0) return null;
  const [primera] = conFecha;
  const dias = primera.dias_para_cobro;
  const mas = conFecha.filter((m) => m.dias_para_cobro === dias).length - 1;
  return { membresia: primera, dias, mas };
}

// "Hoy", "Mañana" o "en N días" para la tarjeta "Próximo cobro".
export function textoProximoCobro(dias) {
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `en ${dias} días`;
}

// Color del punto de la pastilla de cobro (HU-81): 'aviso' si cobra en 3 días o menos (o ya
// venció), 'exito' si falta más. Sin días conocidos: 'neutro'.
export function nivelCobro(diasParaCobro) {
  if (typeof diasParaCobro !== 'number' || Number.isNaN(diasParaCobro)) return 'neutro';
  return diasParaCobro <= 3 ? 'aviso' : 'exito';
}

// Devuelve true si la membresía cobra en 3 días o menos (criterio de aceptación HU-05)
export function esCobroProximo(diasParaCobro) {
  return typeof diasParaCobro === 'number' && diasParaCobro >= 0 && diasParaCobro <= 3;
}

// Texto descriptivo de los días restantes para el cobro
export function textoCobro(diasParaCobro, fechaCobro) {
  const detalleFecha = fechaCobro ? ` (${formatearDiaMes(fechaCobro)})` : '';
  if (typeof diasParaCobro !== 'number' || Number.isNaN(diasParaCobro)) {
    return fechaCobro ? `Cobro: ${formatearDiaMes(fechaCobro)}` : 'Fecha de cobro';
  }
  if (diasParaCobro === 0) return `Cobra hoy${detalleFecha}`;
  if (diasParaCobro === 1) return `Cobra mañana${detalleFecha}`;
  if (diasParaCobro > 1) return `Cobra en ${diasParaCobro} días${detalleFecha}`;
  return `Venció hace ${Math.abs(diasParaCobro)} días${detalleFecha}`;
}

// Obtiene la fecha actual en formato local 'YYYY-MM-DD'
export function obtenerFechaHoyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

// Devuelve el número de días en un mes dado (mes 1-12) de un año
export function diasEnMes(anio, mes) {
  return new Date(anio, mes, 0).getDate();
}

/**
 * Avanza la fecha de cobro al siguiente ciclo si ya venció (HU-51 / BUG-01).
 * Si la fecha es pasada, suma 1 mes o 1 año (según frecuencia) de forma recurrente
 * hasta alcanzar una fecha mayor o igual a la fecha de referencia (hoy por defecto).
 * Respeta el día del mes original cuando el mes destino tiene suficientes días.
 */
export function avanzarFechaCobro(fechaCobroStr, frecuencia = 'mensual', fechaReferenciaStr) {
  if (
    !fechaCobroStr ||
    typeof fechaCobroStr !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fechaCobroStr)
  ) {
    return fechaCobroStr;
  }

  const hoyStr =
    fechaReferenciaStr && /^\d{4}-\d{2}-\d{2}$/.test(fechaReferenciaStr)
      ? fechaReferenciaStr
      : obtenerFechaHoyLocal();

  if (fechaCobroStr >= hoyStr) {
    return fechaCobroStr;
  }

  const [anioInicial, mesInicial, diaInicial] = fechaCobroStr.split('-').map(Number);
  let anio = anioInicial;
  let mes = mesInicial;
  const diaOriginal = diaInicial;
  let fechaActual = fechaCobroStr;

  const esAnual = frecuencia === 'anual';
  let iteraciones = 0;
  const maxIteraciones = esAnual ? 100 : 1200;

  while (fechaActual < hoyStr && iteraciones < maxIteraciones) {
    iteraciones++;
    if (esAnual) {
      anio += 1;
    } else {
      mes += 1;
      if (mes > 12) {
        mes = 1;
        anio += 1;
      }
    }
    const maxDias = diasEnMes(anio, mes);
    const diaAjustado = Math.min(diaOriginal, maxDias);
    const mm = String(mes).padStart(2, '0');
    const dd = String(diaAjustado).padStart(2, '0');
    fechaActual = `${anio}-${mm}-${dd}`;
  }

  return fechaActual;
}

/**
 * Calcula los días enteros entre la fecha de referencia (hoy) y la fecha de cobro.
 */
export function calcularDiasParaCobro(fechaCobroStr, fechaReferenciaStr) {
  if (
    !fechaCobroStr ||
    typeof fechaCobroStr !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fechaCobroStr)
  ) {
    return undefined;
  }
  const hoyStr =
    fechaReferenciaStr && /^\d{4}-\d{2}-\d{2}$/.test(fechaReferenciaStr)
      ? fechaReferenciaStr
      : obtenerFechaHoyLocal();

  const [yCobro, mCobro, dCobro] = fechaCobroStr.split('-').map(Number);
  const [yHoy, mHoy, dHoy] = hoyStr.split('-').map(Number);

  const utcCobro = Date.UTC(yCobro, mCobro - 1, dCobro);
  const utcHoy = Date.UTC(yHoy, mHoy - 1, dHoy);

  return Math.round((utcCobro - utcHoy) / (1000 * 60 * 60 * 24));
}

/**
 * Ajusta una membresía al siguiente ciclo si su fecha ya venció (HU-51 / BUG-01).
 * Conserva la fecha de cobro original en `fecha_cobro_original` por trazabilidad.
 */
export function ajustarAlSiguienteCiclo(membresia, fechaReferenciaStr) {
  if (!membresia || typeof membresia !== 'object') return membresia;
  const fechaOriginal = membresia.fecha_cobro;
  const frecuencia = membresia.frecuencia || 'mensual';
  const proximaFecha = avanzarFechaCobro(fechaOriginal, frecuencia, fechaReferenciaStr);
  const dias = calcularDiasParaCobro(proximaFecha, fechaReferenciaStr);

  return {
    ...membresia,
    fecha_cobro: proximaFecha,
    dias_para_cobro: dias !== undefined ? dias : membresia.dias_para_cobro,
    fecha_cobro_original: membresia.fecha_cobro_original ?? fechaOriginal,
  };
}

// Validaciones de formulario del lado del cliente
export function validarMembresia({ nombre, costoTexto, fechaCobro }) {
  const errores = {};

  if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
    errores.nombre = 'El nombre es obligatorio';
  }

  const costoLimpio = typeof costoTexto === 'string' ? costoTexto.trim() : String(costoTexto ?? '');
  const costoNumero = Number(costoLimpio);

  if (
    !costoLimpio ||
    Number.isNaN(costoNumero) ||
    !Number.isFinite(costoNumero) ||
    costoNumero <= 0
  ) {
    errores.costo = 'Ingresa un costo válido mayor a $0';
  } else if (!/^\d+(\.\d{1,2})?$/.test(costoLimpio)) {
    errores.costo = 'El costo puede tener hasta 2 decimales';
  } else if (costoNumero > 9999999999.99) {
    errores.costo = 'El costo excede el límite permitido';
  }

  if (!fechaCobro || !/^\d{4}-\d{2}-\d{2}$/.test(fechaCobro)) {
    errores.fecha = 'Ingresa una fecha válida (YYYY-MM-DD)';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    costo: costoNumero,
  };
}
