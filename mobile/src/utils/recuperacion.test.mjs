// Recuperar contraseña (HU-65): npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  errorRestablecer,
  esCodigoValido,
  ESPERA_REENVIO_MS,
  formatoCuenta,
  limpiarCodigo,
  segundosRestantes,
} from './recuperacion.js';

describe('código de 6 dígitos', () => {
  it('limpiarCodigo deja solo dígitos y corta a 6 (pegar desde el correo)', () => {
    assert.equal(limpiarCodigo('482 910'), '482910');
    assert.equal(limpiarCodigo('Código: 482-910'), '482910');
    assert.equal(limpiarCodigo('48291077'), '482910');
    assert.equal(limpiarCodigo('abc'), '');
    assert.equal(limpiarCodigo(undefined), '');
  });

  it('esCodigoValido exige exactamente 6 dígitos', () => {
    assert.equal(esCodigoValido('482910'), true);
    assert.equal(esCodigoValido('48291'), false);
    assert.equal(esCodigoValido('4829101'), false);
    assert.equal(esCodigoValido('48291a'), false);
    assert.equal(esCodigoValido(''), false);
  });
});

describe('errorRestablecer', () => {
  it('TOKEN_INVALIDO va al campo del código', () => {
    assert.deepEqual(errorRestablecer('TOKEN_INVALIDO'), {
      campo: 'codigo',
      mensaje: 'El código no es válido o ya venció',
    });
  });

  it('PASSWORD_MUY_CORTA va al campo de contraseña', () => {
    assert.equal(errorRestablecer('PASSWORD_MUY_CORTA').campo, 'password');
  });

  it('los demás códigos son errores generales', () => {
    for (const code of ['SIN_CONEXION', 'ERROR_SERVIDOR', 'DEMASIADAS_SOLICITUDES', undefined]) {
      assert.equal(errorRestablecer(code), null);
    }
  });
});

describe('cuenta regresiva de reenvío', () => {
  it('espera 60 s', () => {
    assert.equal(ESPERA_REENVIO_MS, 60_000);
  });

  it('segundosRestantes redondea hacia arriba y no baja de 0', () => {
    const enviado = 1_000_000;
    const hasta = enviado + ESPERA_REENVIO_MS;
    assert.equal(segundosRestantes(hasta, enviado), 60);
    assert.equal(segundosRestantes(hasta, enviado + 100), 60);
    assert.equal(segundosRestantes(hasta, hasta - 1), 1);
    assert.equal(segundosRestantes(hasta, hasta), 0);
    assert.equal(segundosRestantes(hasta, hasta + 5000), 0);
  });

  it('formatoCuenta muestra m:ss', () => {
    assert.equal(formatoCuenta(60), '1:00');
    assert.equal(formatoCuenta(45), '0:45');
    assert.equal(formatoCuenta(5), '0:05');
  });
});
