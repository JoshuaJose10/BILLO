// Carga de Inicio (HU-39, RF6; HU-73; HU-82): exactamente 5 peticiones en paralelo por cada apertura
// o foco.
// Recibe los servicios para poder probarlo con node --test sin red. Sin imports.

// Movimientos recientes que se muestran en Inicio (los primeros del mes; la API los ordena).
export const MOVIMIENTOS_RECIENTES = 5;

// { obtenerResumen, listarGastos, listarIngresos, listarPresupuestos, listarMembresias } →
// { resumen, gastos, ingresos, presupuestos, membresias }.
// - resumen (GET /reportes/resumen), gastos (GET /gastos?mes) e ingresos (GET /ingresos?mes, el
//   saldo) son obligatorios: si alguno falla, se lanza su error y Inicio muestra Reintentar.
// - presupuestos (GET /presupuestos?mes) es opcional: si falla queda en null e Inicio sigue sin la
//   barra ni la sección de riesgo.
// - membresias (GET /membresias) es opcional: si falla queda en null e Inicio no muestra la
//   tarjeta «Esta semana cobran».
// Las cinco se lanzan antes de esperar a ninguna.
export async function cargarDatosInicio(
  { obtenerResumen, listarGastos, listarIngresos, listarPresupuestos, listarMembresias },
  mes,
) {
  const presupuestos = listarPresupuestos(mes).catch(() => null);
  const membresias = listarMembresias
    ? listarMembresias().catch(() => null)
    : Promise.resolve(null);
  const [resumen, gastos, ingresos] = await Promise.all([
    obtenerResumen(mes),
    listarGastos({ mes }),
    listarIngresos({ mes }),
  ]);
  return {
    resumen,
    gastos: gastos || [],
    ingresos: ingresos || [],
    presupuestos: await presupuestos,
    membresias: await membresias,
  };
}
