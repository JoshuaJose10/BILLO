// Pruebas de utils/notificaciones.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  debeRegistrar,
  destinoNotificacion,
  esTokenPushValido,
  registrarNotificaciones,
} from './notificaciones.js';

const TOKEN = 'ExponentPushToken[abc_123-XYZ]';

describe('esTokenPushValido', () => {
  it('acepta los dos prefijos de Expo', () => {
    assert.equal(esTokenPushValido(TOKEN), true);
    assert.equal(esTokenPushValido('ExpoPushToken[abc]'), true);
  });

  it('rechaza null, vacíos y formatos ajenos', () => {
    assert.equal(esTokenPushValido(null), false);
    assert.equal(esTokenPushValido(''), false);
    assert.equal(esTokenPushValido('ExponentPushToken[]'), false);
    assert.equal(esTokenPushValido('fcm-token-crudo'), false);
    assert.equal(esTokenPushValido(`ExponentPushToken[${'a'.repeat(255)}]`), false);
  });
});

describe('debeRegistrar', () => {
  it('sin sesión no registra', () => {
    assert.equal(debeRegistrar(null, null), false);
    assert.equal(debeRegistrar(undefined, 'jwt-a'), false);
  });

  it('registra con una sesión nueva o restaurada', () => {
    assert.equal(debeRegistrar('jwt-a', null), true);
  });

  it('no repite en la misma sesión', () => {
    assert.equal(debeRegistrar('jwt-a', 'jwt-a'), false);
  });

  it('vuelve a registrar si entra otro usuario', () => {
    assert.equal(debeRegistrar('jwt-b', 'jwt-a'), true);
  });
});

describe('registrarNotificaciones', () => {
  it('con token válido lo manda y lo devuelve', async () => {
    const enviados = [];
    const resultado = await registrarNotificaciones({
      obtenerToken: async () => TOKEN,
      registrar: async (t) => enviados.push(t),
    });
    assert.equal(resultado, TOKEN);
    assert.deepEqual(enviados, [TOKEN]);
  });

  it('sin permiso, simulador o Expo Go (token null) no llama al backend', async () => {
    let llamadas = 0;
    const resultado = await registrarNotificaciones({
      obtenerToken: async () => null,
      registrar: async () => llamadas++,
    });
    assert.equal(resultado, null);
    assert.equal(llamadas, 0);
  });

  it('si obtener el token falla no lanza y avisa', async () => {
    const avisos = [];
    const resultado = await registrarNotificaciones({
      obtenerToken: async () => {
        throw new Error('sin FCM');
      },
      registrar: async () => assert.fail('no debe registrar'),
      avisar: (e) => avisos.push(e.message),
    });
    assert.equal(resultado, null);
    assert.deepEqual(avisos, ['sin FCM']);
  });

  it('un error del backend (TOKEN_PUSH_INVALIDO, sin conexión) no lanza', async () => {
    for (const code of ['TOKEN_PUSH_INVALIDO', 'SIN_CONEXION', 'ERROR_SERVIDOR']) {
      const avisos = [];
      const resultado = await registrarNotificaciones({
        obtenerToken: async () => TOKEN,
        registrar: async () => {
          throw { code, message: '', status: 400 };
        },
        avisar: (e) => avisos.push(e.code),
      });
      assert.equal(resultado, null);
      assert.deepEqual(avisos, [code]);
    }
  });
});

describe('destinoNotificacion', () => {
  it('un aviso de cobro abre Suscripciones', () => {
    assert.deepEqual(destinoNotificacion({ tipo: 'cobro', membresia_id: 4 }), {
      seccion: 'suscripciones',
    });
  });

  it('sin datos también abre Suscripciones', () => {
    assert.deepEqual(destinoNotificacion(undefined), { seccion: 'suscripciones' });
    assert.deepEqual(destinoNotificacion({}), { seccion: 'suscripciones' });
  });

  it('otro tipo no navega', () => {
    assert.equal(destinoNotificacion({ tipo: 'promocion' }), null);
  });
});
