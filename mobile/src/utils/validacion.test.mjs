// Validaciones de los formularios de autenticación: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  errorConfirmacion,
  errorEmail,
  errorPasswordNueva,
  hayErrores,
  MIN_PASSWORD,
} from './validacion.js';

describe('validaciones de autenticación', () => {
  it('errorEmail: vacío, inválido y válido', () => {
    assert.equal(errorEmail('  '), 'Ingresa tu correo');
    assert.equal(errorEmail('ana@correo'), 'Ingresa un correo válido');
    assert.equal(errorEmail(' ana@correo.com '), undefined);
  });

  it('errorPasswordNueva: mínimo de 8 como el backend', () => {
    assert.equal(errorPasswordNueva(''), 'Ingresa una contraseña');
    assert.match(errorPasswordNueva('a'.repeat(MIN_PASSWORD - 1)), /al menos 8/);
    assert.equal(errorPasswordNueva('a'.repeat(MIN_PASSWORD)), undefined);
  });

  it('errorConfirmacion: vacía, distinta e igual', () => {
    assert.equal(errorConfirmacion('secreto12', ''), 'Confirma tu contraseña');
    assert.equal(errorConfirmacion('secreto12', 'secreto13'), 'Las contraseñas no coinciden');
    assert.equal(errorConfirmacion('secreto12', 'secreto12'), undefined);
  });

  it('hayErrores ignora los campos sin mensaje', () => {
    assert.equal(hayErrores({ email: undefined, password: undefined }), false);
    assert.equal(hayErrores({ email: undefined, password: 'Ingresa una contraseña' }), true);
  });
});
