import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { crearEnlace, destinoEnlace, parsearEnlace } from './enlaces.js';

describe('parsearEnlace', () => {
  it('micrófono del widget: gasto con voz', () => {
    assert.deepEqual(parsearEnlace('billo://registrar?tipo=gasto&voz=1'), {
      tipo: 'gasto',
      iniciarVoz: true,
    });
  });
  it('atajo Ingreso: ingreso sin voz', () => {
    assert.deepEqual(parsearEnlace('billo://registrar?tipo=ingreso&voz=0'), {
      tipo: 'ingreso',
      iniciarVoz: false,
    });
  });
  it('sin params: gasto sin voz; acepta billo:/// y la barra final', () => {
    const esperado = { tipo: 'gasto', iniciarVoz: false };
    assert.deepEqual(parsearEnlace('billo://registrar'), esperado);
    assert.deepEqual(parsearEnlace('billo:///registrar/'), esperado);
  });
  it('rechaza valores fuera de lo permitido', () => {
    assert.equal(parsearEnlace('billo://registrar?tipo=transferencia'), null);
    assert.equal(parsearEnlace('billo://registrar?voz=2'), null);
    assert.equal(parsearEnlace('billo://registrar?voz=true'), null);
  });
  it('rechaza otras rutas, otros esquemas y lo que no es texto', () => {
    assert.equal(parsearEnlace('billo://perfil'), null);
    assert.equal(parsearEnlace('billo://registrarse'), null);
    assert.equal(parsearEnlace('https://registrar?tipo=gasto'), null);
    assert.equal(parsearEnlace('exp+billo://expo-development-client/?url=x'), null);
    assert.equal(parsearEnlace(null), null);
  });
  it('crearEnlace produce links que parsearEnlace acepta', () => {
    assert.equal(crearEnlace({ tipo: 'gasto', voz: true }), 'billo://registrar?tipo=gasto&voz=1');
    for (const tipo of ['gasto', 'ingreso']) {
      for (const voz of [true, false]) {
        assert.deepEqual(parsearEnlace(crearEnlace({ tipo, voz })), { tipo, iniciarVoz: voz });
      }
    }
  });
});

describe('destinoEnlace', () => {
  it('con sesión o en el modo exploración: abrir', () => {
    assert.equal(destinoEnlace('Sesion'), 'abrir');
    assert.equal(destinoEnlace('Visitante'), 'abrir');
  });
  it('sin sesión o eligiendo categorías: esperar', () => {
    assert.equal(destinoEnlace('Auth'), 'esperar');
    assert.equal(destinoEnlace('Onboarding'), 'esperar');
    assert.equal(destinoEnlace('ElegirCategorias'), 'esperar');
  });
});
