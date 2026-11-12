// Utilidades para cambio de moneda y divisas (RF11 / HU-56 / HU-77)

import { formatearMonto } from './formato.js';

export const MONEDAS_DISPONIBLES = [
  { codigo: 'MXN', nombre: 'Peso mexicano', simbolo: '$' },
  { codigo: 'USD', nombre: 'Dólar estadounidense', simbolo: '$' },
  { codigo: 'EUR', nombre: 'Euro', simbolo: '€' },
  { codigo: 'CAD', nombre: 'Dólar canadiense', simbolo: '$' },
  { codigo: 'GBP', nombre: 'Libra esterlina', simbolo: '£' },
  { codigo: 'JPY', nombre: 'Yen japonés', simbolo: '¥' },
  { codigo: 'BRL', nombre: 'Real brasileño', simbolo: 'R$' },
  { codigo: 'CHF', nombre: 'Franco suizo', simbolo: 'CHF' },
];

export const MONEDA_DEFECTO = 'MXN';

export function esMonedaSoportada(codigo) {
  return typeof codigo === 'string' && MONEDAS_DISPONIBLES.some((m) => m.codigo === codigo);
}

// Calcula el equivalente en MXN redondeado a 2 decimales para coincidir con la validación de la API:
// |monto_original * tipo_cambio - monto| <= 0.005
export function calcularEquivalenteMxn(montoOriginal, tipoCambio) {
  const monto = typeof montoOriginal === 'number' ? montoOriginal : Number(montoOriginal);
  const tasa = typeof tipoCambio === 'number' ? tipoCambio : Number(tipoCambio);
  if (!Number.isFinite(monto) || !Number.isFinite(tasa) || monto <= 0 || tasa <= 0) {
    return 0;
  }
  return Number((monto * tasa).toFixed(2));
}

// Formatea el monto original con su moneda: ej. 10 y 'USD' → '10 USD'
export function formatearMontoOriginal(montoOriginal, moneda) {
  if (!moneda || moneda === 'MXN') return null;
  if (montoOriginal === null || montoOriginal === undefined) return moneda;
  const num = typeof montoOriginal === 'number' ? montoOriginal : Number(montoOriginal);
  if (!Number.isFinite(num)) return moneda;
  const tieneDecimales = num % 1 !== 0;
  return `${tieneDecimales ? num.toFixed(2) : String(num)} ${moneda}`;
}

// Prepara el objeto de datos para enviar a la API según la moneda elegida
export function prepararDatosGasto({
  montoOriginal,
  moneda = MONEDA_DEFECTO,
  tipoCambio,
  categoriaId,
  fecha,
  metodoPago,
  nota,
}) {
  const base = {
    categoria_id: categoriaId,
    fecha,
    metodo_pago: metodoPago,
    nota: nota?.trim() || null,
  };

  if (moneda === 'MXN' || !moneda) {
    return {
      ...base,
      monto: montoOriginal,
    };
  }

  const montoMxn = calcularEquivalenteMxn(montoOriginal, tipoCambio);
  return {
    ...base,
    monto: montoMxn,
    moneda,
    monto_original: montoOriginal,
    tipo_cambio: tipoCambio,
  };
}

// Formatea el monto en su divisa extranjera: ej. 10 y 'USD' → 'US$10', 10.5 y 'USD' → 'US$10.50' (HU-77)
export function formatearMontoDivisa(montoOriginal, moneda) {
  if (!moneda || moneda === 'MXN') return null;
  const num = typeof montoOriginal === 'number' ? montoOriginal : Number(montoOriginal);
  if (!Number.isFinite(num)) return moneda;
  const numStr = num % 1 !== 0 ? num.toFixed(2) : String(num);
  switch (moneda) {
    case 'USD':
      return `US$${numStr}`;
    case 'EUR':
      return `€${numStr}`;
    case 'GBP':
      return `£${numStr}`;
    case 'JPY':
      return `¥${numStr}`;
    case 'BRL':
      return `R$${numStr}`;
    case 'CAD':
      return `CA$${numStr}`;
    default:
      return `${numStr} ${moneda}`;
  }
}

// Formatea el costo de una membresía: «US$10 ≈ $xxx» si es divisa extranjera, o sólo «$xxx» si es MXN (HU-77)
export function formatearCostoMembresia(costo, moneda, montoOriginal) {
  if (!moneda || moneda === 'MXN' || montoOriginal == null) {
    return formatearMonto(costo);
  }
  const originalTexto = formatearMontoDivisa(montoOriginal, moneda);
  return `${originalTexto} ≈ ${formatearMonto(costo)}`;
}

// Prepara el objeto de membresía para enviar a la API según la moneda elegida (HU-77)
export function prepararDatosMembresia({
  servicioId = null,
  nombre,
  costoOriginal,
  moneda = MONEDA_DEFECTO,
  tipoCambio = null,
  frecuencia,
  fechaCobro,
}) {
  const base = {
    servicio_id: servicioId,
    nombre: typeof nombre === 'string' ? nombre.trim() : nombre,
    frecuencia,
    fecha_cobro: fechaCobro,
  };

  if (moneda === 'MXN' || !moneda) {
    return {
      ...base,
      costo: costoOriginal,
      moneda: 'MXN',
      monto_original: null,
      tipo_cambio: null,
    };
  }

  const costoMxn = calcularEquivalenteMxn(costoOriginal, tipoCambio);
  return {
    ...base,
    costo: costoMxn,
    moneda,
    monto_original: costoOriginal,
    tipo_cambio: tipoCambio,
  };
}
