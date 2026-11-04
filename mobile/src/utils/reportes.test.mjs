// Pruebas de utils/reportes.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizarPorCategoria, normalizarResumen } from './reportes.js';

describe('normalizarResumen', () => {
  it('convierte los montos que llegan como texto', () => {
    assert.deepEqual(
      normalizarResumen({
        mes: '2026-10',
        gasto_variable: '2480.50',
        gasto_fijo: '428',
        total: '2908.50',
      }),
      { mes: '2026-10', gasto_variable: 2480.5, gasto_fijo: 428, total: 2908.5 },
    );
  });

  it('sin respuesta o con valores inválidos da ceros con el mes pedido', () => {
    assert.deepEqual(normalizarResumen(null, '2026-11'), {
      mes: '2026-11',
      gasto_variable: 0,
      gasto_fijo: 0,
      total: 0,
    });
    assert.equal(normalizarResumen({ gasto_variable: 'abc' }).gasto_variable, 0);
  });
});

describe('normalizarPorCategoria', () => {
  it('convierte total y porcentaje', () => {
    assert.deepEqual(
      normalizarPorCategoria([
        { categoria_id: 3, categoria: 'Comida', total: '1260.50', porcentaje: '51' },
      ]),
      [{ categoria_id: 3, categoria: 'Comida', total: 1260.5, porcentaje: 51 }],
    );
  });

  it('tolera null', () => {
    assert.deepEqual(normalizarPorCategoria(null), []);
  });
});
