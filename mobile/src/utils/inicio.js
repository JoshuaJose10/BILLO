// Carga de Inicio (HU-39, RF6): exactamente 3 peticiones en paralelo por cada apertura o foco.
// Recibe los servicios para poder probarlo con node --test sin red. Sin imports.

// Movimientos recientes que se muestran en Inicio (los primeros del mes; la API los ordena).
export const MOVIMIENTOS_RECIENTES = 5;

// { obtenerResumen, listarGastos, listarPresupuestos } → { resumen, gastos, presupuestos }.
// - resumen (GET /reportes/resumen) y gastos (GET /gastos?mes) son obligatorios: si alguno falla,
//   se lanza su error y Inicio muestra Reintentar.
// - presupuestos (GET /presupuestos?mes) es opcional: si falla queda en null e Inicio sigue sin la
//   barra ni la sección de riesgo.
// Las tres se lanzan antes de esperar a ninguna.
export async function cargarDatosInicio({ obtenerResumen, listarGastos, listarPresupuestos }, mes) {
  const presupuestos = listarPresupuestos(mes).catch(() => null);
  const [resumen, gastos] = await Promise.all([obtenerResumen(mes), listarGastos({ mes })]);
  return { resumen, gastos: gastos || [], presupuestos: await presupuestos };
}
