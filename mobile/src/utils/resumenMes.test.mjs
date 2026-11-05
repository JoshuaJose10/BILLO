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

// HU-39: "Gastado este mes" viene de gasto_variable (GET /reportes/resumen) y la barra y los chips
// de los gastos del mes (GET /gastos?mes). Con los mismos gastos, ambos deben sumar lo mismo.
describe('cuadre de la barra con gasto_variable', () => {
  // Como lo calcula el backend: SUM(monto) redondeado a 2 decimales.
  const gastoVariable = (lista) =>
    Math.round((lista.reduce((s, g) => s + g.monto, 0) + Number.EPSILON) * 100) / 100;

  const delMes = [
    { categoria_id: 1, monto: 85.5 },
    { categoria_id: 2, monto: 0.1 },
    { categoria_id: 2, monto: 0.2 },
    { categoria_id: 3, monto: 1199.99 },
    { categoria_id: 1, monto: 14.35 },
    { categoria_id: 4, monto: 333.33 },
    { categoria_id: 4, monto: 333.33 },
    { categoria_id: 4, monto: 333.34 },
  ];

  it('la suma de los tramos y de los chips iguala gasto_variable', () => {
    const servidor = gastoVariable(delMes);
    const porCategoria = gastoPorCategoria(delMes, nombres);
    const resumen = resumenGastoMes(porCategoria, 0, servidor);
    const sumaCentavos = (lista) => Math.round(lista.reduce((s, c) => s + c.total, 0) * 100);
    assert.equal(servidor, 2300.14);
    assert.equal(resumen.gastado, servidor);
    assert.equal(sumaCentavos(porCategoria), Math.round(servidor * 100));
    assert.equal(sumaCentavos(resumen.tramos), Math.round(servidor * 100));
  });

  it('mes sin gastos: todo en ceros', () => {
    const resumen = resumenGastoMes(gastoPorCategoria([], nombres), 0, 0);
    assert.deepEqual(resumen, {
      gastado: 0,
      presupuesto: 0,
      porcentaje: null,
      excedente: 0,
      tramos: [],
    });
  });

  it('sin gastadoServidor se usa la suma de las categorías', () => {
    assert.equal(resumenGastoMes([{ id: '1', total: 10.25 }], 0).gastado, 10.25);
  });
});
