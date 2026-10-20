import { ayer, fechaLocalISO, parsearFechaLocal } from './fechas';

const formatoMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

// El backend devuelve los montos como número, pero NUMERIC de Postgres puede llegar
// como string ("1237.25") si cambia la consulta. Cualquier valor no numérico cuenta como 0.
export function aNumero(valor) {
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

// 1237.25 → "$1,237.25"
export function formatearMonto(valor) {
  return formatoMXN.format(aNumero(valor));
}

const formatoMXNEntero = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Versión compacta para chips: sin decimales cuando son cero ($125), con ellos si los hay ($5.30).
export function formatearMontoCorto(valor) {
  const centavos = Math.round(aNumero(valor) * 100);
  return centavos % 100 === 0
    ? formatoMXNEntero.format(centavos / 100)
    : formatoMXN.format(centavos / 100);
}

// Monto mientras se escribe en el teclado ("1234.5" → "$1,234.5"): respeta los
// decimales tal como se teclearon para que el usuario vea el punto y cada dígito.
export function formatearMontoEnCaptura(texto) {
  if (!texto) return '$0.00';
  const [entero, decimales] = texto.split('.');
  const enteroConComas = (entero || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${enteroConComas}${decimales !== undefined ? `.${decimales}` : ''}`;
}

// Monto en captura separado para el diseño: "1234.5" → { entero: '1,234', decimales: '50' }.
// Los decimales que faltan se completan con 0 ("" → { entero: '0', decimales: '00' }).
export function partesMontoCaptura(texto) {
  const [entero, decimales = ''] = (texto || '').split('.');
  return {
    entero: (entero || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ','),
    decimales: decimales.padEnd(2, '0'),
  };
}

// "YYYY-MM-DD" → "Hoy", "Ayer", "7 oct" (o "7 oct 2025" si no es del año actual).
export function fechaRelativa(fechaStr, hoy = new Date()) {
  if (!fechaStr) return '';
  if (fechaStr === fechaLocalISO(hoy)) return 'Hoy';
  if (fechaStr === fechaLocalISO(ayer(hoy))) return 'Ayer';
  const fecha = parsearFechaLocal(fechaStr);
  const texto = `${fecha.getDate()} ${MESES_CORTOS[fecha.getMonth()]}`;
  return fecha.getFullYear() === hoy.getFullYear() ? texto : `${texto} ${fecha.getFullYear()}`;
}

// Primeras palabras de un texto para mostrarlo en un chip.
export function resumirTexto(texto, maxCaracteres = 14) {
  const limpio = (texto || '').trim().replace(/\s+/g, ' ');
  if (limpio.length <= maxCaracteres) return limpio;
  const corte = limpio.slice(0, maxCaracteres);
  const ultimoEspacio = corte.lastIndexOf(' ');
  return `${ultimoEspacio > 0 ? corte.slice(0, ultimoEspacio) : corte}…`;
}
