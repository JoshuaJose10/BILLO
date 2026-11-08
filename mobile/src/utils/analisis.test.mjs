import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  compararConMesAnterior,
  consejoDelMes,
  desglosePorCategoria,
  etiquetaComparacion,
  periodoComparacion,
  textoComparacion,
} from './analisis.js';

// HU-81: cálculos de Reportes (desglose, comparación con el mes anterior y Consejo Billo).

const NOMBRES = { 1: 'Comida', 2: 'Transporte', 3: 'Salud' };
const nombrePorId = (id) => NOMBRES[id];
const gasto = (id, monto, categoria_id, fecha) => ({ id, monto, categoria_id, fecha });
// 15 de noviembre de 2026, hora local
const HOY = new Date(2026, 10, 15);

describe('periodoComparacion', () => {
  test('en el mes en curso compara hasta hoy', () => {
    assert.deepEqual(periodoComparacion('2026-11', HOY), {
      mesAnterior: '2026-10',
      hastaDia: 15,
      mismaFecha: true,
    });
  });

  test('en un mes pasado compara meses completos (y cruza el año)', () => {
    assert.deepEqual(periodoComparacion('2026-01', HOY), {
      mesAnterior: '2025-12',
      hastaDia: null,
      mismaFecha: false,
    });
  });
});

describe('desglosePorCategoria', () => {
  test('total, cantidad y porcentaje por categoría, de mayor a menor', () => {
    const filas = desglosePorCategoria(
      [
        gasto(1, 100, 2, '2026-11-01'),
        gasto(2, 300, 1, '2026-11-02'),
        gasto(3, 50.5, 1, '2026-11-03'),
        gasto(4, 49.5, 3, '2026-11-04'),
      ],
      nombrePorId,
    );
    assert.deepEqual(
      filas.map((f) => [f.categoria, f.total, f.cantidad]),
      [
        ['Comida', 350.5, 2],
        ['Transporte', 100, 1],
        ['Salud', 49.5, 1],
      ],
    );
    const suma = filas.reduce((s, f) => s + f.porcentaje, 0);
    assert.equal(Math.round(suma * 10) / 10, 100);
  });

  test('sin nombre en la caché usa "Sin categoría"; sin gastos, lista vacía', () => {
    assert.equal(
      desglosePorCategoria([gasto(1, 10, 99, '2026-11-01')])[0].categoria,
      'Sin categoría',
    );
    assert.deepEqual(desglosePorCategoria([]), []);
    assert.deepEqual(desglosePorCategoria(null), []);
  });
});

describe('compararConMesAnterior', () => {
  const anterior = [
    gasto(10, 200, 1, '2026-10-05'),
    gasto(11, 100, 2, '2026-10-14'),
    gasto(12, 500, 1, '2026-10-28'), // después del día 15: no cuenta en el mes en curso
  ];

  test('mes en curso: compara hasta el mismo día del mes anterior', () => {
    const c = compararConMesAnterior({
      mes: '2026-11',
      gastosMes: [gasto(1, 150, 1, '2026-11-03'), gasto(2, 90, 2, '2026-11-10')],
      gastosAnterior: anterior,
      hoy: HOY,
    });
    assert.equal(c.disponible, true);
    assert.equal(c.anterior, 300);
    assert.equal(c.actual, 240);
    assert.equal(c.diferencia, -60);
    assert.equal(c.porcentaje, -20);
    assert.equal(c.direccion, 'bajo');
    assert.equal(etiquetaComparacion(c), 'vs Oct -20%');
    assert.equal(
      textoComparacion(c),
      'Has gastado $60.00 menos que el mes pasado a esta misma fecha.',
    );
  });

  test('mes pasado: meses completos y sin "a esta misma fecha"', () => {
    const c = compararConMesAnterior({
      mes: '2026-11',
      gastosMes: [gasto(1, 880, 1, '2026-11-03')],
      gastosAnterior: anterior,
      hoy: new Date(2026, 11, 2), // ya es diciembre
    });
    assert.equal(c.anterior, 800);
    assert.equal(c.direccion, 'subio');
    assert.equal(etiquetaComparacion(c), 'vs Oct +10%');
    assert.equal(textoComparacion(c), 'Has gastado $80.00 más que el mes pasado.');
  });

  test('mes anterior sin gastos (o que no se pudo pedir) no se compara', () => {
    for (const gastosAnterior of [[], null, [gasto(1, 50, 1, '2026-10-30')]]) {
      const c = compararConMesAnterior({
        mes: '2026-11',
        gastosMes: [gasto(2, 10, 1, '2026-11-01')],
        gastosAnterior,
        hoy: HOY,
      });
      assert.equal(c.disponible, false);
      assert.equal(textoComparacion(c), 'Sin datos del mes anterior para comparar');
    }
  });

  test('mismo gasto: 0% y "lo mismo"', () => {
    const c = compararConMesAnterior({
      mes: '2026-11',
      gastosMes: [gasto(1, 300, 1, '2026-11-01')],
      gastosAnterior: anterior,
      hoy: HOY,
    });
    assert.equal(c.direccion, 'igual');
    assert.equal(etiquetaComparacion(c), 'vs Oct 0%');
    assert.match(textoComparacion(c), /lo mismo/);
  });
});

describe('consejoDelMes', () => {
  const base = { mes: '2026-11', nombrePorId, hoy: HOY };

  test('si se pasó de un presupuesto, nombra la categoría que más se pasó', () => {
    const consejo = consejoDelMes({
      ...base,
      gastosMes: [],
      gastosAnterior: [],
      presupuestos: [
        { categoria: 'Transporte', monto_limite: 500, gastado: 550 },
        { categoria: 'Comida', monto_limite: 1000, gastado: 1350 },
        { categoria: 'Salud', monto_limite: 300, gastado: 100 },
      ],
    });
    assert.equal(consejo, 'Comida te sacó del presupuesto: va $350.00 arriba de su límite.');
  });

  test('si no, la categoría con mayor cambio % vs el mes anterior', () => {
    const consejo = consejoDelMes({
      ...base,
      gastosMes: [gasto(1, 96, 1, '2026-11-02'), gasto(2, 150, 2, '2026-11-03')],
      gastosAnterior: [
        gasto(10, 100, 1, '2026-10-02'), // Comida -4%
        gasto(11, 100, 2, '2026-10-03'), // Transporte +50%
        gasto(12, 999, 2, '2026-10-30'), // fuera del periodo
      ],
      presupuestos: [{ categoria: 'Comida', monto_limite: 1000, gastado: 96 }],
    });
    assert.equal(consejo, 'Tus gastos en Transporte subieron 50% respecto al mes pasado.');
  });

  test('una categoría que dejó de tener gastos cuenta como -100%', () => {
    const consejo = consejoDelMes({
      ...base,
      gastosMes: [gasto(1, 100, 1, '2026-11-02')],
      gastosAnterior: [gasto(10, 100, 1, '2026-10-02'), gasto(11, 40, 3, '2026-10-03')],
      presupuestos: null,
    });
    assert.equal(consejo, 'Tus gastos en Salud bajaron 100% respecto al mes pasado.');
  });

  test('sin datos suficientes no hay consejo', () => {
    assert.equal(consejoDelMes({ ...base, gastosMes: [], gastosAnterior: null }), null);
    assert.equal(consejoDelMes({ ...base, gastosMes: [], gastosAnterior: [] }), null);
    // mismo gasto que el mes pasado: ningún cambio que contar
    assert.equal(
      consejoDelMes({
        ...base,
        gastosMes: [gasto(1, 100, 1, '2026-11-02')],
        gastosAnterior: [gasto(10, 100, 1, '2026-10-02')],
      }),
      null,
    );
  });
});
