import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { partesMonto } from './formato.js';
import { proximoCobro, textoProximoCobro } from './membresias.js';

// HU-72 (extra en Inicio): tarjeta "Próximo cobro" y saldo con centavos pequeños.

describe('proximoCobro', () => {
  test('toma la de fecha más próxima', () => {
    const r = proximoCobro([
      { id: 1, nombre: 'Netflix', dias_para_cobro: 9 },
      { id: 2, nombre: 'Spotify', dias_para_cobro: 3 },
      { id: 3, nombre: 'iCloud', dias_para_cobro: 20 },
    ]);
    assert.equal(r.membresia.id, 2);
    assert.equal(r.dias, 3);
    assert.equal(r.mas, 0);
  });

  test('varias el mismo día: la primera por nombre y cuántas más', () => {
    const r = proximoCobro([
      { id: 1, nombre: 'Zeta', dias_para_cobro: 2 },
      { id: 2, nombre: 'Alfa', dias_para_cobro: 2 },
      { id: 3, nombre: 'Beta', dias_para_cobro: 2 },
      { id: 4, nombre: 'Lejana', dias_para_cobro: 10 },
    ]);
    assert.equal(r.membresia.id, 2);
    assert.equal(r.mas, 2);
  });

  test('ignora las sin fecha o vencidas; sin ninguna: null', () => {
    assert.equal(proximoCobro([{ id: 1, nombre: 'X' }]), null);
    assert.equal(proximoCobro([{ id: 1, nombre: 'X', dias_para_cobro: -2 }]), null);
    assert.equal(proximoCobro([]), null);
    assert.equal(proximoCobro(null), null);
    const r = proximoCobro([
      { id: 1, nombre: 'Sin fecha' },
      { id: 2, nombre: 'Hoy', dias_para_cobro: 0 },
    ]);
    assert.equal(r.membresia.id, 2);
  });
});

describe('textoProximoCobro', () => {
  test('Hoy, Mañana o en N días', () => {
    assert.equal(textoProximoCobro(0), 'Hoy');
    assert.equal(textoProximoCobro(1), 'Mañana');
    assert.equal(textoProximoCobro(3), 'en 3 días');
  });
});

describe('partesMonto', () => {
  test('separa los centavos del entero', () => {
    assert.deepEqual(partesMonto(7854.55), { entero: '$7,854', centavos: '.55' });
    assert.deepEqual(partesMonto(0), { entero: '$0', centavos: '.00' });
    assert.deepEqual(partesMonto(-1234.5), { entero: '-$1,234', centavos: '.50' });
  });
});
