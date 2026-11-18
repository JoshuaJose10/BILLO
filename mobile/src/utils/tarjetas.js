import { aNumero } from './formato.js';

// Lógica pura de tarjetas (sin React Native, se prueba con node --test).

export const TIPOS_TARJETA = [
  { valor: 'credito', etiqueta: 'Crédito', icono: 'credit-card-chip-outline' },
  { valor: 'debito', etiqueta: 'Débito', icono: 'credit-card-outline' },
];

export const NOMBRE_TARJETA_MAX = 100;

const COLORES_MARCA_TARJETA = [
  { patron: /bbva/i, color: '#2563EB' },
  { patron: /\bnu\b|nubank/i, color: '#8B5CF6' },
  { patron: /santander|hsbc|scotiabank/i, color: '#EF4444' },
  { patron: /banamex|citibanamex|amex|american express/i, color: '#0284C7' },
  { patron: /banorte|azteca|inbursa/i, color: '#059669' },
  { patron: /hey|rappi|mercado\s*pago|klar|stori/i, color: '#D97706' },
];

const redondear2 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;

export function etiquetaTipoTarjeta(tipo) {
  if (tipo === 'credito') return 'Crédito';
  if (tipo === 'debito') return 'Débito';
  return '';
}

export function formatearUltimos4(ultimos4) {
  const limpio = typeof ultimos4 === 'string' ? ultimos4.trim() : String(ultimos4 ?? '').trim();
  if (!/^\d{4}$/.test(limpio)) return '';
  return `·· ${limpio}`;
}

export function etiquetaTarjeta(tarjeta) {
  if (!tarjeta || typeof tarjeta !== 'object') return '';
  const nombre = typeof tarjeta.nombre === 'string' ? tarjeta.nombre.trim() : '';
  const sufijo = formatearUltimos4(tarjeta.ultimos4);
  if (nombre && sufijo) return `${nombre} ${sufijo}`;
  return nombre || sufijo;
}

export function subtituloTarjeta(tarjeta) {
  if (!tarjeta || typeof tarjeta !== 'object') return '';
  const partes = [etiquetaTipoTarjeta(tarjeta.tipo), formatearUltimos4(tarjeta.ultimos4)].filter(
    Boolean,
  );
  return partes.join(' · ');
}

export function textoFechasTarjeta(tarjeta) {
  if (!tarjeta || typeof tarjeta !== 'object') return null;
  const corte =
    tarjeta.dia_corte !== null && tarjeta.dia_corte !== undefined
      ? Number(tarjeta.dia_corte)
      : null;
  const pago =
    tarjeta.dia_pago !== null && tarjeta.dia_pago !== undefined ? Number(tarjeta.dia_pago) : null;
  const partes = [];
  if (Number.isInteger(corte) && corte >= 1 && corte <= 31) {
    partes.push(`Corte día ${corte}`);
  }
  if (Number.isInteger(pago) && pago >= 1 && pago <= 31) {
    partes.push(`Pago día ${pago}`);
  }
  return partes.length > 0 ? partes.join(' · ') : null;
}

export function colorTarjeta(tarjeta) {
  const nombre = typeof tarjeta?.nombre === 'string' ? tarjeta.nombre : '';
  for (const item of COLORES_MARCA_TARJETA) {
    if (item.patron.test(nombre)) return item.color;
  }
  return tarjeta?.tipo === 'debito' ? '#0EA5E9' : '#6366F1';
}

export function nombreTarjetaPorId(tarjetas, tarjetaId) {
  if (tarjetaId === null || tarjetaId === undefined || !Array.isArray(tarjetas)) return null;
  const encontrada = tarjetas.find((t) => Number(t?.id) === Number(tarjetaId));
  return encontrada ? etiquetaTarjeta(encontrada) : null;
}

function validarDiaOpcional(texto) {
  if (texto === null || texto === undefined) return { valido: true, valor: null };
  const limpio = String(texto).trim();
  if (limpio === '') return { valido: true, valor: null };
  if (!/^\d{1,2}$/.test(limpio)) return { valido: false, valor: null };
  const numero = Number(limpio);
  if (!Number.isInteger(numero) || numero < 1 || numero > 31) {
    return { valido: false, valor: null };
  }
  return { valido: true, valor: numero };
}

export function validarTarjeta({
  nombre = '',
  tipo = 'credito',
  ultimos4 = '',
  diaCorteTexto = '',
  diaPagoTexto = '',
} = {}) {
  const errores = {};
  const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';

  if (!nombreLimpio) {
    errores.nombre = 'Ingresa el nombre de la tarjeta';
  } else if (nombreLimpio.length > NOMBRE_TARJETA_MAX) {
    errores.nombre = `El nombre puede tener hasta ${NOMBRE_TARJETA_MAX} caracteres`;
  }

  if (tipo !== 'credito' && tipo !== 'debito') {
    errores.tipo = 'Elige el tipo de tarjeta';
  }

  const ultimos4Limpio = typeof ultimos4 === 'string' ? ultimos4.trim() : String(ultimos4 ?? '');
  if (!/^\d{4}$/.test(ultimos4Limpio)) {
    errores.ultimos4 = 'Ingresa exactamente los 4 últimos dígitos';
  }

  const corte = validarDiaOpcional(diaCorteTexto);
  if (!corte.valido) {
    errores.dia_corte = 'El día de corte debe ser entre 1 y 31';
  }

  const pago = validarDiaOpcional(diaPagoTexto);
  if (!pago.valido) {
    errores.dia_pago = 'El día de pago debe ser entre 1 y 31';
  }

  const valido = Object.keys(errores).length === 0;
  return {
    valido,
    errores,
    datos: valido
      ? {
          nombre: nombreLimpio,
          tipo,
          ultimos4: ultimos4Limpio,
          dia_corte: corte.valor,
          dia_pago: pago.valor,
        }
      : null,
  };
}

export function calcularResumenTarjetaMes(tarjetaId, gastos = [], membresias = [], mes = null) {
  const idNum = Number(tarjetaId);
  const gastosTarjeta = (gastos || []).filter(
    (g) =>
      Number(g?.tarjeta_id) === idNum &&
      (!mes || (typeof g?.fecha === 'string' && g.fecha.startsWith(`${mes}-`))),
  );
  const gasto_variable = redondear2(gastosTarjeta.reduce((acc, g) => acc + aNumero(g.monto), 0));

  const membresiasActivas = (membresias || []).filter(
    (m) => Number(m?.tarjeta_id) === idNum && m?.estado !== 'pausada',
  );
  const gasto_fijo = redondear2(
    membresiasActivas.reduce((acc, m) => {
      const costo = aNumero(m.costo);
      return acc + (m.frecuencia === 'anual' ? costo / 12 : costo);
    }, 0),
  );

  return {
    tarjeta_id: idNum,
    mes,
    gasto_variable,
    gasto_fijo,
    total: redondear2(gasto_variable + gasto_fijo),
  };
}

export function resumenGeneralTarjetas(tarjetas = []) {
  const lista = Array.isArray(tarjetas) ? tarjetas : [];
  const totalMes = redondear2(lista.reduce((acc, t) => acc + aNumero(t?.total_mes), 0));
  const credito = lista.filter((t) => t?.tipo === 'credito').length;
  const debito = lista.filter((t) => t?.tipo === 'debito').length;
  return {
    totalMes,
    cantidad: lista.length,
    credito,
    debito,
  };
}
