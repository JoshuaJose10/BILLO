// Pruebas de utils/presupuestos.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  avanceBarra,
  categoriasDeGasto,
  estadoMasGrave,
  excedente,
  normalizarPresupuesto,
  resumenPresupuestos,
} from './presupuestos.js';

describe('normalizarPresupuesto', () => {
  it('convierte los montos que llegan como texto', () => {
    const p = normalizarPresupuesto({
      id: 5,
      monto_limite: '1500',
      gastado: '1260.50',
      porcentaje: '84',
      estado: 'alerta',
    });
    assert.deepEqual(
      { limite: p.monto_limite, gastado: p.gastado, porcentaje: p.porcentaje },
      { limite: 1500, gastado: 1260.5, porcentaje: 84 },
    );
    assert.equal(p.estado, 'alerta');
  });

  it('un estado desconocido cuenta como ok', () => {
    assert.equal(normalizarPresupuesto({ estado: 'raro' }).estado, 'ok');
  });
});

describe('categoriasDeGasto', () => {
  it('quita las de membresía y acepta las que no traen tipo', () => {
    const lista = [
      { id: 1, nombre: 'Comida' },
      { id: 2, nombre: 'Netflix', tipo: 'membresia' },
      { id: 3, nombre: 'Salud', tipo: 'gasto' },
    ];
    assert.deepEqual(
      categoriasDeGasto(lista).map((c) => c.id),
      [1, 3],
    );
  });

  it('tolera null', () => {
    assert.deepEqual(categoriasDeGasto(null), []);
  });
});

describe('avanceBarra', () => {
  it('convierte el porcentaje en fracción con tope de 100%', () => {
    assert.equal(avanceBarra(0), 0);
    assert.equal(avanceBarra(84), 0.84);
    assert.equal(avanceBarra(100), 1);
    assert.equal(avanceBarra(250), 1);
    assert.equal(avanceBarra(-5), 0);
    assert.equal(avanceBarra(undefined), 0);
  });
});

describe('excedente', () => {
  it('es lo que se pasó del límite, o 0', () => {
    assert.equal(excedente({ gastado: 1700.25, monto_limite: 1500 }), 200.25);
    assert.equal(excedente({ gastado: 1500, monto_limite: 1500 }), 0);
    assert.equal(excedente({ gastado: 800, monto_limite: 1500 }), 0);
  });

  it('no arrastra errores de coma flotante', () => {
    assert.equal(excedente({ gastado: 0.3, monto_limite: 0.1 }), 0.2);
  });
});

describe('estadoMasGrave', () => {
  it('excedido > alerta > ok', () => {
    assert.equal(estadoMasGrave([]), 'ok');
    assert.equal(estadoMasGrave([{ estado: 'ok' }, { estado: 'alerta' }]), 'alerta');
    assert.equal(
      estadoMasGrave([{ estado: 'alerta' }, { estado: 'excedido' }, { estado: 'ok' }]),
      'excedido',
    );
  });
});

describe('resumenPresupuestos', () => {
  it('suma límites y gastado y toma el estado más grave', () => {
    const r = resumenPresupuestos([
      { monto_limite: 1500, gastado: 1260.5, estado: 'alerta' },
      { monto_limite: 500, gastado: 100, estado: 'ok' },
    ]);
    assert.deepEqual(r, { limite: 2000, gastado: 1360.5, porcentaje: 68, estado: 'alerta' });
  });

  it('sin presupuestos da ceros', () => {
    assert.deepEqual(resumenPresupuestos([]), {
      limite: 0,
      gastado: 0,
      porcentaje: 0,
      estado: 'ok',
    });
  });
});
