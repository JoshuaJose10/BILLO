// Ingresos (HU-82). Sin imports de React Native para probarlo con node --test.

// Fuentes que ofrece la hoja en modo Ingreso (el backend acepta cualquier texto de hasta 100).
export const FUENTES = [
  { nombre: 'Sueldo', icono: 'briefcase-outline' },
  { nombre: 'Beca', icono: 'school-outline' },
  { nombre: 'Freelance', icono: 'laptop' },
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
