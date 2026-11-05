// Reglas de negocio y utilidades para Membresías / Suscripciones (RF5)
// Sin imports externos para compatibilidad directa con Metro y node --test.

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
  { match: /netflix/i, color: '#E50914', icono: 'movie-open' },
  { match: /spotify/i, color: '#1DB954', icono: 'spotify' },
  { match: /youtube/i, color: '#FF0000', icono: 'youtube' },
  { match: /apple music/i, color: '#FC3C44', icono: 'apple' },
  { match: /disney/i, color: '#113CCF', icono: 'movie-play' },
  { match: /hbo/i, color: '#5822B4', icono: 'television-play' },
  { match: /prime/i, color: '#00A8E1', icono: 'video' },
  { match: /xbox/i, color: '#107C10', icono: 'microsoft-xbox' },
  { match: /canva/i, color: '#00C4CC', icono: 'palette' },
  { match: /chatgpt/i, color: '#10A37F', icono: 'robot' },
  { match: /google/i, color: '#4285F4', icono: 'google-cloud' },
  { match: /icloud/i, color: '#3699FF', icono: 'apple-icloud' },
];

const DEFAULT_SERVICIO = {
  color: '#8B5CF6',
  icono: 'calendar-sync',
};

// Obtiene el color e ícono distintivo de una membresía según su nombre
export function estiloServicio(nombre = '') {
  const encontrado = SERVICIOS_PREDEFINIDOS.find((s) => s.match.test(nombre));
  return encontrado ? { color: encontrado.color, icono: encontrado.icono } : DEFAULT_SERVICIO;
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
