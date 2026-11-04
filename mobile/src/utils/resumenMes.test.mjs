// Pruebas de utils/resumenMes.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  etiquetaBarraMes,
  gastoPorCategoria,
  nivelPorcentaje,
  resumenGastoMes,
} from './resumenMes.js';

const nombres = { 1: 'Comida', 2: 'Servicios', 3: 'Transporte' };
const gastos = [
  { categoria_id: 1, monto: 300 },
  { categoria_id: 3, monto: 255 },
  { categoria_id: 1, monto: 260 },
  { categoria_id: 2, monto: 422 },
];

describe('gastoPorCategoria', () => {
  it('suma por categoría y ordena de mayor a menor', () => {
    assert.deepEqual(gastoPorCategoria(gastos, nombres), [
      { id: '1', nombre: 'Comida', total: 560 },
      { id: '2', nombre: 'Servicios', total: 422 },
      { id: '3', nombre: 'Transporte', total: 255 },
    ]);
  });

  it('sin gastos da una lista vacía', () => {
    assert.deepEqual(gastoPorCategoria([], nombres), []);
    assert.deepEqual(gastoPorCategoria(null), []);
  });

  it('redondea los centavos', () => {
    assert.equal(
      gastoPorCategoria([
        { categoria_id: 1, monto: 0.1 },
        { categoria_id: 1, monto: 0.2 },
      ])[0].total,
      0.3,
    );
  });
});

describe('resumenGastoMes', () => {
  const porCategoria = gastoPorCategoria(gastos, nombres);

  it('tramos por categoría sobre el presupuesto', () => {
    const r = resumenGastoMes(porCategoria, 5000);
    assert.equal(r.gastado, 1237);
    assert.equal(r.presupuesto, 5000);
    assert.equal(r.porcentaje, 25);
    assert.equal(r.excedente, 0);
    assert.deepEqual(
      r.tramos.map((t) => [t.nombre, t.fraccion]),
      [
        ['Comida', 0.112],
        ['Servicios', 0.0844],
        ['Transporte', 0.051],
      ],
    );
  });

  it('excedido: la barra queda llena y hay excedente', () => {
    const r = resumenGastoMes(porCategoria, 1000);
    assert.equal(r.porcentaje, 124);
    assert.equal(r.excedente, 237);
    const suma = r.tramos.reduce((s, t) => s + t.fraccion, 0);
    assert.ok(Math.abs(suma - 1) < 1e-9);
  });

  it('sin presupuesto: los tramos llenan el 100% en proporción al gasto', () => {
    for (const presupuesto of [0, null, undefined]) {
      const r = resumenGastoMes(porCategoria, presupuesto);
      assert.equal(r.presupuesto, 0);
      assert.equal(r.porcentaje, null);
      assert.equal(r.excedente, 0);
      const suma = r.tramos.reduce((s, t) => s + t.fraccion, 0);
      assert.ok(Math.abs(suma - 1) < 1e-9);
    }
  });

  it('sin gastos: sin tramos ni excedente', () => {
    assert.deepEqual(resumenGastoMes([], 5000), {
      gastado: 0,
      presupuesto: 5000,
      porcentaje: 0,
      excedente: 0,
      tramos: [],
    });
    assert.deepEqual(resumenGastoMes([], 0).tramos, []);
  });
});

describe('nivelPorcentaje', () => {
  it('normal < 80, aviso de 80 a 100, alerta > 100', () => {
    assert.equal(nivelPorcentaje(25), 'normal');
    assert.equal(nivelPorcentaje(79), 'normal');
    assert.equal(nivelPorcentaje(80), 'aviso');
    assert.equal(nivelPorcentaje(100), 'aviso');
    assert.equal(nivelPorcentaje(101), 'alerta');
  });
});

describe('etiquetaBarraMes', () => {
  const porCategoria = gastoPorCategoria(gastos, nombres);

  it('con presupuesto', () => {
    assert.equal(
      etiquetaBarraMes(resumenGastoMes(porCategoria, 5000)),
      'Gastado 1,237 de 5,000 pesos, 25%. Comida 560, Servicios 422, Transporte 255',
    );
  });

  it('sin presupuesto', () => {
    assert.equal(
      etiquetaBarraMes(resumenGastoMes(porCategoria, 0)),
      'Gastado 1,237 pesos. Comida 560, Servicios 422, Transporte 255',
    );
  });
});
