import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  calcularTotalMensual,
  esCobroProximo,
  estiloServicio,
  textoCobro,
  validarMembresia,
} from './membresias.js';

describe('utils/membresias', () => {
  describe('calcularTotalMensual', () => {
    test('devuelve 0 con lista vacía o nula', () => {
      assert.equal(calcularTotalMensual([]), 0);
      assert.equal(calcularTotalMensual(null), 0);
      assert.equal(calcularTotalMensual(undefined), 0);
    });

    test('suma membresías mensuales exactas', () => {
      const membresias = [
        { costo: 199, frecuencia: 'mensual' },
        { costo: 129, frecuencia: 'mensual' },
      ];
      assert.equal(calcularTotalMensual(membresias), 328);
    });

    test('divide las anuales entre 12 y suma con las mensuales', () => {
      const membresias = [
        { costo: 500, frecuencia: 'mensual' },
        { costo: 1200, frecuencia: 'anual' }, // aporta 100
      ];
      assert.equal(calcularTotalMensual(membresias), 600);
    });

    test('redondea a 2 decimales', () => {
      const membresias = [
        { costo: 100, frecuencia: 'anual' }, // 8.333333...
      ];
      assert.equal(calcularTotalMensual(membresias), 8.33);
    });
  });

  describe('esCobroProximo', () => {
    test('es true para 0, 1, 2, 3 días', () => {
      assert.equal(esCobroProximo(0), true);
      assert.equal(esCobroProximo(1), true);
      assert.equal(esCobroProximo(2), true);
      assert.equal(esCobroProximo(3), true);
    });

    test('es false para 4 o más días y para negativos', () => {
      assert.equal(esCobroProximo(4), false);
      assert.equal(esCobroProximo(10), false);
      assert.equal(esCobroProximo(-1), false);
      assert.equal(esCobroProximo(null), false);
      assert.equal(esCobroProximo(undefined), false);
    });
  });

  describe('textoCobro', () => {
    test('muestra texto según los días', () => {
      assert.match(textoCobro(0, '2026-11-03'), /Cobra hoy/);
      assert.match(textoCobro(1, '2026-11-04'), /Cobra mañana/);
      assert.match(textoCobro(3, '2026-11-06'), /Cobra en 3 días/);
      assert.match(textoCobro(-2, '2026-11-01'), /Venció hace 2 días/);
    });
  });

  describe('estiloServicio', () => {
    test('asigna color e icono específico a servicios conocidos', () => {
      assert.equal(estiloServicio('Netflix').color, '#E50914');
      assert.equal(estiloServicio('Spotify Individual').color, '#1DB954');
      assert.equal(estiloServicio('YouTube Premium').color, '#FF0000');
    });

    test('usa valores por defecto para nombres desconocidos', () => {
      const def = estiloServicio('Gimnasio Municipal');
      assert.equal(def.color, '#8B5CF6');
      assert.equal(def.icono, 'calendar-sync');
    });
  });

  describe('validarMembresia', () => {
    test('valida correctamente datos válidos', () => {
      const res = validarMembresia({
        nombre: 'Netflix',
        costoTexto: '199',
        fechaCobro: '2026-11-15',
      });
      assert.equal(res.valido, true);
      assert.equal(res.costo, 199);
      assert.deepEqual(res.errores, {});
    });

    test('falla con nombre vacío (CP-RF5-03)', () => {
      const res = validarMembresia({
        nombre: '   ',
        costoTexto: '199',
        fechaCobro: '2026-11-15',
      });
      assert.equal(res.valido, false);
      assert.equal(res.errores.nombre, 'El nombre es obligatorio');
    });

    test('falla con costo "abc" o no numérico (CP-RF5-04)', () => {
      const res = validarMembresia({
        nombre: 'Spotify',
        costoTexto: 'abc',
        fechaCobro: '2026-11-15',
      });
      assert.equal(res.valido, false);
      assert.equal(res.errores.costo, 'Ingresa un costo válido mayor a $0');
    });

    test('falla con costo 0 o negativo', () => {
      const res0 = validarMembresia({
        nombre: 'Spotify',
        costoTexto: '0',
        fechaCobro: '2026-11-15',
      });
      assert.equal(res0.valido, false);

      const resNeg = validarMembresia({
        nombre: 'Spotify',
        costoTexto: '-50',
        fechaCobro: '2026-11-15',
      });
      assert.equal(resNeg.valido, false);
    });

    test('falla con más de 2 decimales', () => {
      const res = validarMembresia({
        nombre: 'Spotify',
        costoTexto: '199.999',
        fechaCobro: '2026-11-15',
      });
      assert.equal(res.valido, false);
      assert.equal(res.errores.costo, 'El costo puede tener hasta 2 decimales');
    });
  });
});
