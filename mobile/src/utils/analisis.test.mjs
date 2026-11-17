import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { repartirPorcentajes } from './reportes.js';
import {
  compararConMesAnterior,
  compararIngresosConMesAnterior,
  consejoDelMes,
  desglosePorCategoria,
  etiquetaComparacion,
  textoComparacion,
  textoComparacionIngresos,
} from './analisis.js';

// HU-81: cálculos de Reportes (desglose, comparación con el mes anterior y Consejo Billo).

const NOMBRES = { 1: 'Comida', 2: 'Transporte', 3: 'Salud' };
const nombrePorId = (id) => NOMBRES[id];
const gasto = (id, monto, categoria_id, fecha) => ({ id, monto, categoria_id, fecha });
// 15 de noviembre de 2026, hora local
const HOY = new Date(2026, 10, 15);

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

  test('porcentajes enteros que suman 100 por mayor residuo', () => {
    // 1/3, 1/3, 1/3 → 34, 33, 33 (el sobrante va al primero por residuo y orden)
    const filas = desglosePorCategoria(
      [
        gasto(1, 100, 1, '2026-11-01'),
        gasto(2, 100, 2, '2026-11-02'),
        gasto(3, 100, 3, '2026-11-03'),
      ],
      nombrePorId,
    );
    assert.ok(filas.every((f) => Number.isInteger(f.porcentaje)));
    assert.equal(
      filas.reduce((s, f) => s + f.porcentaje, 0),
      100,
    );
    // 91 / 9: sin decimales
    const dos = desglosePorCategoria(
      [gasto(1, 910, 1, '2026-11-01'), gasto(2, 90, 2, '2026-11-02')],
      nombrePorId,
    );
    assert.deepEqual(
      dos.map((f) => f.porcentaje),
      [91, 9],
    );
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
    gasto(12, 500, 1, '2026-10-28'), // después del día de hoy: también cuenta
  ];

  test('mes en curso: compara contra el mes anterior completo', () => {
    const c = compararConMesAnterior({
      mes: '2026-11',
      gastosMes: [gasto(1, 150, 1, '2026-11-03'), gasto(2, 90, 2, '2026-11-10')],
      gastosAnterior: anterior,
      hoy: HOY,
    });
    assert.equal(c.disponible, true);
    assert.equal(c.anterior, 800);
    assert.equal(c.actual, 240);
    assert.equal(c.diferencia, -560);
    assert.equal(c.porcentaje, -70);
    assert.equal(c.direccion, 'bajo');
    assert.equal(etiquetaComparacion(c), 'vs Oct -70%');
    assert.equal(
      textoComparacion(c),
      'Llevas $240.00 este mes; octubre cerró en $800.00. $560.00 menos que octubre completo.',
    );
  });

  test('mes en curso con gastos del anterior solo después de hoy: sí compara', () => {
    const c = compararConMesAnterior({
      mes: '2026-11',
      gastosMes: [gasto(1, 900, 1, '2026-11-03')],
      gastosAnterior: [gasto(10, 600, 1, '2026-10-20')],
      hoy: new Date(2026, 10, 9),
    });
    assert.equal(c.disponible, true);
    assert.equal(etiquetaComparacion(c), 'vs Oct +50%');
    assert.equal(
      textoComparacion(c),
      'Llevas $900.00 este mes; octubre cerró en $600.00. $300.00 más que octubre completo.',
    );
  });

  test('mes pasado: meses completos con la frase de siempre', () => {
    const c = compararConMesAnterior({
      mes: '2026-10',
      gastosMes: [gasto(1, 880, 1, '2026-10-03')],
      gastosAnterior: [gasto(10, 800, 1, '2026-09-28')],
      hoy: HOY,
    });
    assert.equal(c.anterior, 800);
    assert.equal(c.direccion, 'subio');
    assert.equal(etiquetaComparacion(c), 'vs Sep +10%');
    assert.equal(textoComparacion(c), 'Has gastado $80.00 más que el mes pasado.');
  });

  test('enero se compara con diciembre del año anterior', () => {
    const c = compararConMesAnterior({
      mes: '2027-01',
      gastosMes: [gasto(1, 100, 1, '2027-01-02')],
      gastosAnterior: [gasto(10, 400, 1, '2026-12-30')],
      hoy: new Date(2027, 0, 5),
    });
    assert.equal(c.mesAnterior, '2026-12');
    assert.equal(etiquetaComparacion(c), 'vs Dic -75%');
    assert.equal(
      textoComparacion(c),
      'Llevas $100.00 este mes; diciembre cerró en $400.00. $300.00 menos que diciembre completo.',
    );
  });

  test('mes anterior sin gastos (o que no se pudo pedir) no se compara', () => {
    for (const gastosAnterior of [[], null]) {
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
      gastosMes: [gasto(1, 800, 1, '2026-11-01')],
      gastosAnterior: anterior,
      hoy: HOY,
    });
    assert.equal(c.direccion, 'igual');
    assert.equal(etiquetaComparacion(c), 'vs Oct 0%');
    assert.equal(
      textoComparacion(c),
      'Llevas $800.00 este mes; octubre cerró en $800.00. Lo mismo que octubre completo.',
    );
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

describe('repartirPorcentajes', () => {
  test('con 0 decimales: enteros, mínimo 1 y suma 100', () => {
    const r = repartirPorcentajes([99800, 100, 100], 0);
    assert.deepEqual(r, [98, 1, 1]);
  });

  test('por defecto conserva un decimal (dona)', () => {
    const r = repartirPorcentajes([1, 1, 1]);
    assert.deepEqual(r, [33.4, 33.3, 33.3]);
  });
});

describe('compararIngresosConMesAnterior y textoComparacionIngresos', () => {
  test('compara ingresos del mes pasado y del mes en curso frente al mes anterior', () => {
    const subioPasado = compararIngresosConMesAnterior(
      {
        mes: '2026-10',
        total: 15000,
        mes_anterior: '2026-09',
        total_mes_anterior: 12000,
      },
      HOY,
    );
    assert.equal(subioPasado.disponible, true);
    assert.equal(subioPasado.direccion, 'subio');
    assert.equal(subioPasado.porcentaje, 25);
    assert.equal(
      textoComparacionIngresos(subioPasado),
      'Recibiste $3,000.00 más que el mes pasado.',
    );

    const enCurso = compararIngresosConMesAnterior(
      {
        mes: '2026-11',
        total: 11500,
        mes_anterior: '2026-10',
        total_mes_anterior: 10500,
      },
      HOY,
    );
    assert.equal(enCurso.enCurso, true);
    assert.equal(
      textoComparacionIngresos(enCurso),
      'Llevas $11,500.00 este mes; octubre cerró en $10,500.00. $1,000.00 más que octubre completo.',
    );

    const sinAnterior = compararIngresosConMesAnterior(
      { mes: '2026-11', total: 5000, mes_anterior: '2026-10', total_mes_anterior: 0 },
      HOY,
    );
    assert.equal(sinAnterior.disponible, false);
    assert.equal(textoComparacionIngresos(sinAnterior), 'Sin datos del mes anterior para comparar');
  });
});
