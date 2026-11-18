// Validaciones de los formularios de autenticación y cuenta: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  errorConfirmacion,
  errorEmail,
  errorNombre,
  errorPasswordNueva,
  hayErrores,
  MAX_NOMBRE,
  MIN_PASSWORD,
  validarCambioContrasena,
  validarEditarNombre,
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

describe('validaciones de Perfil: editar nombre y cambiar contraseña', () => {
  it('errorNombre y validarEditarNombre: de 1 a 100 caracteres con recorte de espacios', () => {
    assert.equal(errorNombre(''), 'Ingresa tu nombre');
    assert.equal(errorNombre('   '), 'Ingresa tu nombre');
    assert.match(errorNombre('A'.repeat(MAX_NOMBRE + 1)), /100/);
    assert.equal(errorNombre('  Fernando  '), undefined);

    assert.deepEqual(validarEditarNombre('  Fernando Villafuerte  '), {
      valido: true,
      nombre: 'Fernando Villafuerte',
      error: null,
    });
    assert.equal(validarEditarNombre('   ').valido, false);
  });

  it('validarCambioContrasena: pide actual, nueva de >= 8 distinta a la actual y confirmación igual', () => {
    const vacio = validarCambioContrasena({});
    assert.equal(vacio.valido, false);
    assert.equal(vacio.errores.actual, 'Ingresa tu contraseña actual');
    assert.equal(vacio.errores.nueva, 'Ingresa una contraseña');
    assert.equal(vacio.errores.confirmacion, 'Confirma tu contraseña');

    const corta = validarCambioContrasena({
      actual: 'actual123',
      nueva: '1234567',
      confirmacion: '1234567',
    });
    assert.equal(corta.valido, false);
    assert.match(corta.errores.nueva, /al menos 8/);

    const repetida = validarCambioContrasena({
      actual: 'actual123',
      nueva: 'actual123',
      confirmacion: 'actual123',
    });
    assert.equal(repetida.valido, false);
    assert.match(repetida.errores.nueva, /diferente a la actual/);

    const noCoincide = validarCambioContrasena({
      actual: 'actual123',
      nueva: 'nuevaClave123',
      confirmacion: 'otraClave123',
    });
    assert.equal(noCoincide.valido, false);
    assert.equal(noCoincide.errores.confirmacion, 'Las contraseñas no coinciden');

    const ok = validarCambioContrasena({
      actual: 'actual123',
      nueva: 'nuevaClave123',
      confirmacion: 'nuevaClave123',
    });
    assert.equal(ok.valido, true);
    assert.equal(hayErrores(ok.errores), false);
  });
});
