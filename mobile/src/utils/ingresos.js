// Ingresos (HU-82). Sin imports de React Native para probarlo con node --test.

// Fuentes que ofrece la hoja en modo Ingreso (el backend acepta cualquier texto de hasta 100).
export const FUENTES = [
  { nombre: 'Sueldo', icono: 'briefcase-outline' },
  { nombre: 'Aguinaldo/Bono', icono: 'star-circle-outline' },
  { nombre: 'Beca', icono: 'school-outline' },
  { nombre: 'Freelance', icono: 'laptop' },
  { nombre: 'Ventas', icono: 'storefront-outline' },
  { nombre: 'Inversiones', icono: 'trending-up' },
  { nombre: 'Renta', icono: 'home-city-outline' },
  { nombre: 'Regalo', icono: 'gift-outline' },
  { nombre: 'Reembolso', icono: 'cash-refund' },
  { nombre: 'Otro', icono: 'dots-horizontal-circle-outline' },
];

// Fuente desconocida o vacía (otro cliente, Postman).
export const ICONO_INGRESO = 'cash-plus';

export const iconoFuente = (fuente) =>
  FUENTES.find((f) => f.nombre === fuente?.trim())?.icono ?? ICONO_INGRESO;

// Límite de `descripcion` que valida el backend.
export const DESCRIPCION_MAX = 200;

const redondear2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export const totalIngresos = (ingresos) =>
  redondear2((ingresos || []).reduce((suma, i) => suma + i.monto, 0));

// Saldo disponible de Inicio: ingresos del mes − gastos del mes (gasto_variable de
// /reportes/resumen, el mismo «Gastado este mes»; las suscripciones no se restan). Puede ser
// negativo (también sin ingresos si ya hubo gastos). Solo un mes sin ingresos ni gastos da null:
// TarjetaSaldo invita a registrar ingresos en vez de mostrar un $0.00.
export function saldoDelMes(ingresos, gastoMes) {
  if (!ingresos?.length && !(gastoMes > 0)) return null;
  return redondear2(totalIngresos(ingresos) - (gastoMes || 0));
}

// Recurrencia (contrato v1.9): `frecuencia` 'semanal' | 'quincenal' | 'mensual' o null (único).
export const OPCIONES_FRECUENCIA = [
  { valor: null, etiqueta: 'No' },
  { valor: 'semanal', etiqueta: 'Semanal' },
  { valor: 'quincenal', etiqueta: 'Quincenal' },
  { valor: 'mensual', etiqueta: 'Mensual' },
];

// undefined / '' / 'no' / desconocida → null; si no, la frecuencia en minúsculas.
export function normalizarFrecuencia(frecuencia) {
  const valor = typeof frecuencia === 'string' ? frecuencia.trim().toLowerCase() : '';
  return OPCIONES_FRECUENCIA.some((o) => o.valor && o.valor === valor) ? valor : null;
}

// 'quincenal' → 'Quincenal'; sin frecuencia, 'No'.
export const etiquetaFrecuencia = (frecuencia) =>
  OPCIONES_FRECUENCIA.find((o) => o.valor === normalizarFrecuencia(frecuencia)).etiqueta;
