import { tituloDia } from './formato.js';

const masReciente = (a, b) => (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1);
// Dentro de un día: ingresos, cobros de suscripciones y luego gastos.
const ORDEN_TIPO = { ingreso: 0, suscripcion: 1, gasto: 2 };

// Secciones por día para la SectionList de Movimientos: [{ fecha, titulo, total, data }], del día
// más reciente al más antiguo. `fecha` ya es "YYYY-MM-DD" local (el backend guarda DATE), así que
// se agrupa por el texto.
// Los ingresos (HU-82) se mezclan con `tipo: 'ingreso'` y van primero en su día; gastos e ingresos
// se ordenan por id descendente dentro del día (son tablas distintas: sus ids no se comparan).
// Los cobros de suscripciones (cobrosSuscripcionesEnMes, ya con `tipo: 'suscripcion'`) se
// mezclan igual, después de los ingresos de su día.
// `total` suma SOLO gastos: es el «gastado» del día.
export function agruparPorDia(gastos, ingresos = [], suscripciones = []) {
  const movimientos = [
    ...ingresos.map((i) => ({ ...i, tipo: 'ingreso' })),
    ...suscripciones,
    ...gastos.map((g) => ({ ...g, tipo: 'gasto' })),
  ].sort((a, b) =>
    a.fecha === b.fecha && a.tipo !== b.tipo
      ? ORDEN_TIPO[a.tipo] - ORDEN_TIPO[b.tipo]
      : masReciente(a, b),
  );
  const secciones = [];
  movimientos.forEach((m) => {
    const gastado = m.tipo === 'gasto' ? m.monto : 0;
    const ultima = secciones[secciones.length - 1];
    if (ultima && ultima.fecha === m.fecha) {
      ultima.data.push(m);
      ultima.total += gastado;
    } else {
      secciones.push({ fecha: m.fecha, titulo: tituloDia(m.fecha), total: gastado, data: [m] });
    }
  });
  return secciones;
}

// Clave única en la lista mezclada: un gasto y un ingreso pueden tener el mismo id.
export const claveMovimiento = (m) => `${m.tipo}-${m.id}`;

// Ruta y params al tocar un movimiento: la hoja de edición del gasto o del ingreso, o la de la
// suscripción (con las demás para el aviso de servicio repetido).
//   navigation.navigate(...rutaMovimiento(m, membresias))
export const rutaMovimiento = (m, membresias) =>
  m.tipo === 'suscripcion'
    ? ['Membresia', { membresia: m.membresia, membresiasExistentes: membresias ?? [] }]
    : ['NuevoGasto', m.tipo === 'ingreso' ? { ingreso: m } : { gasto: m }];
