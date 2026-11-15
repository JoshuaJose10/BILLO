// Pruebas de utils/movimientos.js: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { agruparPorDia, claveMovimiento, rutaMovimiento } from './movimientos.js';

const gasto = (id, fecha, monto) => ({ id, fecha, monto });

describe('agruparPorDia', () => {
  it('agrupa los gastos del más reciente al más antiguo y suma el total del día', () => {
    const secciones = agruparPorDia([
      gasto(1, '2026-11-02', 50),
      gasto(3, '2026-11-03', 10),
      gasto(2, '2026-11-02', 25.5),
    ]);
    assert.deepEqual(
      secciones.map((s) => [s.fecha, s.total, s.data.map((m) => m.id)]),
      [
        ['2026-11-03', 10, [3]],
        ['2026-11-02', 75.5, [2, 1]],
      ],
    );
    assert.ok(secciones.every((s) => s.data.every((m) => m.tipo === 'gasto')));
  });

  it('mezcla los ingresos por día, primero en su día, sin sumarlos al total', () => {
    const secciones = agruparPorDia(
      [gasto(1, '2026-11-02', 200), gasto(2, '2026-11-02', 30)],
      [
        { id: 1, fecha: '2026-11-02', monto: 1000 },
        { id: 7, fecha: '2026-11-05', monto: 500 },
      ],
    );
    assert.deepEqual(
      secciones.map((s) => [s.fecha, s.total, s.data.map(claveMovimiento)]),
      [
        ['2026-11-05', 0, ['ingreso-7']],
        ['2026-11-02', 230, ['ingreso-1', 'gasto-2', 'gasto-1']],
      ],
    );
  });

  it('sin movimientos no hay secciones', () => {
    assert.deepEqual(agruparPorDia([], []), []);
  });
});

describe('agruparPorDia con cobros de suscripciones', () => {
  const cobro = (id, fecha, monto) => ({ tipo: 'suscripcion', id, fecha, monto, nota: 'Netflix' });

  it('se mezclan por día, después de los ingresos, y no suman al total del día', () => {
    const secciones = agruparPorDia(
      [{ id: 1, fecha: '2026-11-09', monto: 100 }],
      [{ id: 1, fecha: '2026-11-09', monto: 500 }],
      [cobro(7, '2026-11-09', 219), cobro(8, '2026-11-02', 99)],
    );
    assert.deepEqual(
      secciones.map((s) => [s.fecha, s.total, s.data.map(claveMovimiento)]),
      [
        ['2026-11-09', 100, ['ingreso-1', 'suscripcion-7', 'gasto-1']],
        ['2026-11-02', 0, ['suscripcion-8']],
      ],
    );
  });
});

describe('rutaMovimiento', () => {
  it('gasto e ingreso abren su hoja; la suscripción abre Membresia', () => {
    const gasto = { tipo: 'gasto', id: 1 };
    const ingreso = { tipo: 'ingreso', id: 2 };
    const membresia = { id: 7, nombre: 'Netflix' };
    assert.deepEqual(rutaMovimiento(gasto), ['NuevoGasto', { gasto }]);
    assert.deepEqual(rutaMovimiento(ingreso), ['NuevoGasto', { ingreso }]);
    assert.deepEqual(rutaMovimiento({ tipo: 'suscripcion', id: 7, membresia }, [membresia]), [
      'Membresia',
      { membresia, membresiasExistentes: [membresia] },
    ]);
  });
});
