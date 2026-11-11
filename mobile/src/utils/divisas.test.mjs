import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  calcularEquivalenteMxn,
  esMonedaSoportada,
  formatearMontoOriginal,
  MONEDA_DEFECTO,
  MONEDAS_DISPONIBLES,
  prepararDatosGasto,
} from './divisas.js';

describe('utils/divisas (RF11)', () => {
  test('MONEDA_DEFECTO es MXN y está en las disponibles', () => {
    assert.equal(MONEDA_DEFECTO, 'MXN');
    assert.ok(MONEDAS_DISPONIBLES.some((m) => m.codigo === 'MXN'));
    assert.ok(MONEDAS_DISPONIBLES.some((m) => m.codigo === 'USD'));
  });

  test('esMonedaSoportada valida códigos conocidos', () => {
    assert.equal(esMonedaSoportada('USD'), true);
    assert.equal(esMonedaSoportada('EUR'), true);
    assert.equal(esMonedaSoportada('MXN'), true);
    assert.equal(esMonedaSoportada('XYZ'), false);
    assert.equal(esMonedaSoportada(''), false);
    assert.equal(esMonedaSoportada(null), false);
  });

  test('calcularEquivalenteMxn convierte y redondea a 2 decimales', () => {
    // 10 USD a tasa 18.6311 = 186.311 -> 186.31
    assert.equal(calcularEquivalenteMxn(10, 18.6311), 186.31);
    // 25.50 USD a 19.123456 = 487.648128 -> 487.65
    assert.equal(calcularEquivalenteMxn(25.5, 19.123456), 487.65);
    // Casos no válidos dan 0
    assert.equal(calcularEquivalenteMxn(0, 18.5), 0);
    assert.equal(calcularEquivalenteMxn(-10, 18.5), 0);
    assert.equal(calcularEquivalenteMxn(10, 0), 0);
    assert.equal(calcularEquivalenteMxn(null, 18.5), 0);
  });

  test('formatearMontoOriginal devuelve la moneda y el monto solo si es distinta de MXN', () => {
    assert.equal(formatearMontoOriginal(10, 'MXN'), null);
    assert.equal(formatearMontoOriginal(10, null), null);
    assert.equal(formatearMontoOriginal(10, 'USD'), '10 USD');
    assert.equal(formatearMontoOriginal(10.5, 'USD'), '10.50 USD');
    assert.equal(formatearMontoOriginal(null, 'USD'), 'USD');
  });

  test('prepararDatosGasto arma la estructura correcta para MXN', () => {
    const res = prepararDatosGasto({
      montoOriginal: 150,
      moneda: 'MXN',
      categoriaId: 2,
      fecha: '2026-11-10',
      metodoPago: 'efectivo',
      nota: 'Almuerzo',
    });

    assert.deepEqual(res, {
      categoria_id: 2,
      fecha: '2026-11-10',
      metodo_pago: 'efectivo',
      nota: 'Almuerzo',
      monto: 150,
    });
    assert.equal(res.moneda, undefined);
    assert.equal(res.monto_original, undefined);
  });

  test('prepararDatosGasto arma la estructura correcta para USD', () => {
    const res = prepararDatosGasto({
      montoOriginal: 10,
      moneda: 'USD',
      tipoCambio: 18.6311,
      categoriaId: 3,
      fecha: '2026-11-10',
      metodoPago: 'tarjeta',
      nota: 'Libro',
    });

    assert.equal(res.monto, 186.31);
    assert.equal(res.moneda, 'USD');
    assert.equal(res.monto_original, 10);
    assert.equal(res.tipo_cambio, 18.6311);
    assert.equal(res.categoria_id, 3);
    assert.equal(res.fecha, '2026-11-10');
    assert.equal(res.metodo_pago, 'tarjeta');
    assert.equal(res.nota, 'Libro');
  });
});
