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
  { match: /disney/i, color: coloresServicio.disney, icono: 'movie-play' },
  { match: /hbo/i, color: coloresServicio.hbo, icono: 'television-play' },
  { match: /prime/i, color: coloresServicio.prime, icono: 'video' },
  { match: /xbox/i, color: coloresServicio.xbox, icono: 'microsoft-xbox' },
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
// anuales se dividen entre 12. Redondeado a 2 decimales.
export function calcularTotalMensual(membresias = []) {
  if (!Array.isArray(membresias) || membresias.length === 0) return 0;
  const suma = membresias.reduce((total, m) => {
    const costo = Number(m.costo) || 0;
    if (m.frecuencia === 'anual') {
      return total + costo / 12;
    }
    return total + costo;
  }, 0);
  return Math.round(suma * 100) / 100;
}

// Costo mensual de una membresía: las anuales se reparten en 12 meses.
const costoMensual = (m) => {
  const costo = Number(m?.costo) || 0;
  return m?.frecuencia === 'anual' ? costo / 12 : costo;
};

// Tramos de la barra "Total mensual" de Cartera (HU-81), para BarraCategorias:
// [{ id, nombre, fraccion, color }] con el color de marca de cada servicio, de mayor a menor costo
// mensual. Las fracciones suman 1 (la barra se llena: no hay límite como en presupuestos). Las
// membresías sin costo no generan tramo.
export function tramosSuscripciones(membresias = []) {
  const conCosto = (Array.isArray(membresias) ? membresias : [])
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
