import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  calcularEquivalenteMxn,
  esMonedaSoportada,
  formatearCostoMembresia,
  formatearMontoDivisa,
  formatearMontoOriginal,
  MONEDA_DEFECTO,
  MONEDAS_DISPONIBLES,
  prepararDatosGasto,
  prepararDatosMembresia,
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

  describe('membresías con moneda propia (HU-77 / RF11)', () => {
    test('formatearMontoDivisa formatea según el símbolo o prefijo de la moneda', () => {
      assert.equal(formatearMontoDivisa(10, 'USD'), 'US$10');
      assert.equal(formatearMontoDivisa(9.99, 'USD'), 'US$9.99');
      assert.equal(formatearMontoDivisa(10.5, 'USD'), 'US$10.50');
      assert.equal(formatearMontoDivisa(10, 'EUR'), '€10');
      assert.equal(formatearMontoDivisa(15, 'GBP'), '£15');
      assert.equal(formatearMontoDivisa(1000, 'JPY'), '¥1000');
      assert.equal(formatearMontoDivisa(10, 'MXN'), null);
      assert.equal(formatearMontoDivisa(10, null), null);
    });

    test('formatearCostoMembresia muestra «US$10 ≈ $xxx» si es extranjera o sólo «$xxx» si es MXN', () => {
      // 10 USD con equivalente 186.31 MXN
      assert.equal(formatearCostoMembresia(186.31, 'USD', 10), 'US$10 ≈ $186.31');
      // Membresía en MXN
      assert.equal(formatearCostoMembresia(199, 'MXN', null), '$199.00');
      assert.equal(formatearCostoMembresia(199, null, null), '$199.00');
    });

    test('prepararDatosMembresia arma datos correctos para MXN', () => {
      const payload = prepararDatosMembresia({
        servicioId: 1,
        nombre: 'Netflix',
        costoOriginal: 199,
        moneda: 'MXN',
        frecuencia: 'mensual',
        fechaCobro: '2026-11-20',
      });

      assert.deepEqual(payload, {
        servicio_id: 1,
        nombre: 'Netflix',
        costo: 199,
        moneda: 'MXN',
        monto_original: null,
        tipo_cambio: null,
        frecuencia: 'mensual',
        fecha_cobro: '2026-11-20',
      });
    });

    test('prepararDatosMembresia calcula equivalente en MXN para moneda extranjera', () => {
      const payload = prepararDatosMembresia({
        servicioId: null,
        nombre: 'GitHub Copilot',
        costoOriginal: 10,
        moneda: 'USD',
        tipoCambio: 18.6311,
        frecuencia: 'mensual',
        fechaCobro: '2026-11-20',
      });

      assert.equal(payload.nombre, 'GitHub Copilot');
      assert.equal(payload.costo, 186.31);
      assert.equal(payload.moneda, 'USD');
      assert.equal(payload.monto_original, 10);
      assert.equal(payload.tipo_cambio, 18.6311);
      assert.equal(payload.frecuencia, 'mensual');
      assert.equal(payload.fecha_cobro, '2026-11-20');
    });
  });
});
