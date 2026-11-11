// Pruebas de utils/cobrosSemana.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cobrosDeLaSemana, diaDeCobro } from './cobrosSemana.js';

// Martes 10 de noviembre de 2026.
const HOY = new Date(2026, 10, 10);
const m = (id, nombre, costo, dias) => ({ id, nombre, costo, dias_para_cobro: dias });

describe('diaDeCobro', () => {
  it('hoy, mañana o el día de la semana', () => {
    assert.equal(diaDeCobro(0, HOY), 'hoy');
    assert.equal(diaDeCobro(1, HOY), 'mañana');
    assert.equal(diaDeCobro(2, HOY), 'jueves');
    assert.equal(diaDeCobro(7, HOY), 'martes');
  });
});

describe('cobrosDeLaSemana', () => {
  it('con un cobro en 2 días aparece con nombre, monto y día', () => {
    const { cobros, total } = cobrosDeLaSemana([m(1, 'Netflix', 199, 2)], HOY);
    assert.deepEqual(cobros, [{ id: 1, nombre: 'Netflix', costo: 199, dias: 2, dia: 'jueves' }]);
    assert.equal(total, 199);
  });

  it('con un cobro a 8 días no aparece', () => {
    const r = cobrosDeLaSemana([m(1, 'Spotify', 129, 8)], HOY);
    assert.deepEqual(r, { cobros: [], total: 0 });
  });

  it('con dos cobros en la semana suma ambos y los ordena por cercanía', () => {
    const { cobros, total } = cobrosDeLaSemana(
      [m(1, 'Spotify', 129.5, 5), m(2, 'Netflix', 199, 0), m(3, 'HBO', 99, 30)],
      HOY,
    );
    assert.deepEqual(
      cobros.map((c) => c.nombre),
      ['Netflix', 'Spotify'],
    );
    assert.equal(total, 328.5);
  });

  it('el día 7 entra y los vencidos o sin días se ignoran', () => {
    const { cobros } = cobrosDeLaSemana(
      [m(1, 'A', 10, 7), m(2, 'B', 10, -3), { id: 3, nombre: 'C', costo: 10 }],
      HOY,
    );
    assert.deepEqual(
      cobros.map((c) => c.id),
      [1],
    );
  });

  it('acepta costos como texto y entradas inválidas', () => {
    assert.equal(cobrosDeLaSemana([m(1, 'A', '49.90', 1)], HOY).total, 49.9);
    assert.deepEqual(cobrosDeLaSemana(null, HOY), { cobros: [], total: 0 });
  });
});
