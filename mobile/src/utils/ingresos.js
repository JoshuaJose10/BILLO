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

// Saldo disponible de Inicio: ingresos del mes − gastos del mes (gasto_variable de
// /reportes/resumen, el mismo «Gastado este mes»; las suscripciones no se restan). Sin ingresos en
// el mes → null: TarjetaSaldo invita a registrarlos en vez de mostrar un saldo negativo.
export function saldoDelMes(ingresos, gastoMes) {
  if (!ingresos?.length) return null;
  const totalIngresos = ingresos.reduce((suma, i) => suma + i.monto, 0);
  return redondear2(totalIngresos - (gastoMes || 0));
}
