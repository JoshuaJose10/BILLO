import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

// config/api.js lee la URL al importarse.
process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.100:3000';
const { textosError } = await import('./errores.js');

// HU-69: textos del estado de error de una carga. npm test
describe('textosError', () => {
  test('sin red, timeout o servidor apagado → Sin conexión', () => {
    assert.deepEqual(textosError({ code: 'SIN_CONEXION', status: 0 }), {
      titulo: 'Sin conexión',
      mensaje: 'Revisa tu internet e intenta de nuevo.',
    });
  });

  test('5xx genérico (mapeado a SIN_CONEXION con su status) → falla nuestra', () => {
    for (const status of [500, 503]) {
      assert.equal(
        textosError({ code: 'SIN_CONEXION', status }).titulo,
        'Algo salió mal de nuestro lado',
      );
    }
  });

  test('otro error usa su mensaje como título y sin mensaje', () => {
    assert.deepEqual(textosError({ code: 'MES_INVALIDO', status: 400 }), {
      titulo: 'El mes no es válido.',
      mensaje: null,
    });
  });
});
