// Pruebas de utils/monto.js con el runner de Node (sin dependencias): npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { aplicarTecla, montoDesdeTexto, textoDesdeMonto } from './monto.js';

describe('textoDesdeMonto', () => {
  it('convierte montos enteros y con decimales', () => {
    assert.equal(textoDesdeMonto(85), '85');
    assert.equal(textoDesdeMonto(85.5), '85.5');
    assert.equal(textoDesdeMonto(85.55), '85.55');
    assert.equal(textoDesdeMonto(0.5), '0.5');
  });

  it('conserva el cero de los centavos', () => {
    assert.equal(textoDesdeMonto(85.05), '85.05');
  });

  it('acepta el monto como texto (por si la API lo manda así)', () => {
    assert.equal(textoDesdeMonto('85.50'), '85.5');
  });

  it('redondea a 2 decimales', () => {
    assert.equal(textoDesdeMonto(0.1 + 0.2), '0.3');
  });

  it('devuelve "" con montos no válidos', () => {
    assert.equal(textoDesdeMonto(0), '');
    assert.equal(textoDesdeMonto(-5), '');
    assert.equal(textoDesdeMonto(Number.NaN), '');
    assert.equal(textoDesdeMonto(undefined), '');
  });

  it('es el inverso de montoDesdeTexto', () => {
    for (const monto of [85, 85.5, 85.55, 0.5, 1234.5, 999999999.99]) {
      assert.equal(montoDesdeTexto(textoDesdeMonto(monto)), monto);
    }
  });

  it('deja un texto que el teclado puede seguir editando', () => {
    assert.equal(aplicarTecla(textoDesdeMonto(85.5), '5'), '85.55');
    assert.equal(aplicarTecla(textoDesdeMonto(85.55), '1'), '85.55');
    assert.equal(aplicarTecla(textoDesdeMonto(85), '0'), '850');
  });
});
