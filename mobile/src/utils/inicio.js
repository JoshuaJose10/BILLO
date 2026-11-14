// Carga de Inicio (HU-39, RF6; HU-73; HU-82): exactamente 5 peticiones en paralelo por cada apertura
// o foco.
// Recibe los servicios para poder probarlo con node --test sin red. Sin imports de React Native.

import { agruparPorDia } from './movimientos.js';

// Movimientos recientes que se muestran en Inicio.
export const MOVIMIENTOS_RECIENTES = 5;

// Los `n` movimientos más recientes del mes, gastos e ingresos mezclados (HU-82) en el mismo orden
// que Movimientos (agruparPorDia), cada uno con su `tipo`.
export const movimientosRecientes = (gastos, ingresos, n = MOVIMIENTOS_RECIENTES) =>
  agruparPorDia(gastos, ingresos)
    .flatMap((s) => s.data)
    .slice(0, n);

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
