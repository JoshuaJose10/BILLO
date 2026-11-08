import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { coloresServicio } from '../theme/servicios.js';
import { nivelCobro, tramosSuscripciones } from './membresias.js';

// HU-81: barra "Total mensual" y pastilla de cobro de Suscripciones.

describe('tramosSuscripciones', () => {
  test('un tramo por servicio, de mayor a menor costo mensual, con su color de marca', () => {
    const tramos = tramosSuscripciones([
      { id: 1, nombre: 'Spotify', costo: 129, frecuencia: 'mensual' },
      { id: 2, nombre: 'Netflix', costo: 299, frecuencia: 'mensual' },
      { id: 3, nombre: 'Gimnasio', costo: 1200, frecuencia: 'anual' }, // 100 al mes
    ]);
    assert.deepEqual(
      tramos.map((t) => t.id),
      [2, 1, 3],
    );
    assert.equal(tramos[0].color, coloresServicio.netflix);
    assert.equal(tramos[2].color, coloresServicio.defecto);
    assert.equal(tramos[2].fraccion, 100 / 528);
  });

  test('las fracciones suman 1', () => {
    const tramos = tramosSuscripciones([
      { id: 1, nombre: 'A', costo: 10 },
      { id: 2, nombre: 'B', costo: 20 },
      { id: 3, nombre: 'C', costo: 30.33 },
    ]);
    const suma = tramos.reduce((s, t) => s + t.fraccion, 0);
    assert.ok(Math.abs(suma - 1) < 1e-9);
  });

  test('sin membresías o sin costo no hay tramos', () => {
    assert.deepEqual(tramosSuscripciones([]), []);
    assert.deepEqual(tramosSuscripciones(undefined), []);
    assert.deepEqual(tramosSuscripciones([{ id: 1, nombre: 'X', costo: 0 }]), []);
  });
});

describe('nivelCobro', () => {
  test('aviso con 3 días o menos (y vencidas), éxito con más', () => {
    assert.equal(nivelCobro(0), 'aviso');
    assert.equal(nivelCobro(3), 'aviso');
    assert.equal(nivelCobro(-2), 'aviso');
    assert.equal(nivelCobro(4), 'exito');
    assert.equal(nivelCobro(20), 'exito');
  });

  test('sin días conocidos es neutro', () => {
    assert.equal(nivelCobro(undefined), 'neutro');
    assert.equal(nivelCobro(Number.NaN), 'neutro');
  });
});
