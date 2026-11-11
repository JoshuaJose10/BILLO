import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { decodificarPayloadJwt, esAdmin, obtenerRolDesdeToken } from './auth.js';

describe('utils/auth - Rol desde JWT', () => {
  // Token fake con rol admin: {"id":1,"rol":"admin"}
  // base64Url: eyJpZCI6MSwicm9sIjoiYWRtaW4ifQ
  const tokenAdmin = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwicm9sIjoiYWRtaW4ifQ.firma';

  // Token fake con rol usuario: {"id":2,"rol":"usuario"}
  // base64Url: eyJpZCI6Miwicm9sIjoidXN1YXJpbyJ9
  const tokenUsuario = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6Miwicm9sIjoidXN1YXJpbyJ9.firma';

  // Token sin campo rol: {"id":3}
  // base64Url: eyJpZCI6M30
  const tokenSinRol = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6M30.firma';

  test('decodificarPayloadJwt devuelve el payload parsed', () => {
    assert.deepEqual(decodificarPayloadJwt(tokenAdmin), { id: 1, rol: 'admin' });
    assert.deepEqual(decodificarPayloadJwt(tokenUsuario), { id: 2, rol: 'usuario' });
    assert.equal(decodificarPayloadJwt(null), null);
    assert.equal(decodificarPayloadJwt('invalido'), null);
  });

  test('obtenerRolDesdeToken obtiene el rol o usuario por defecto', () => {
    assert.equal(obtenerRolDesdeToken(tokenAdmin), 'admin');
    assert.equal(obtenerRolDesdeToken(tokenUsuario), 'usuario');
    assert.equal(obtenerRolDesdeToken(tokenSinRol), 'usuario');
    assert.equal(obtenerRolDesdeToken(null), 'usuario');
  });

  test('esAdmin devuelve true solo para admin', () => {
    assert.equal(esAdmin(tokenAdmin), true);
    assert.equal(esAdmin(tokenUsuario), false);
    assert.equal(esAdmin(tokenSinRol), false);
    assert.equal(esAdmin(null), false);
  });
});
