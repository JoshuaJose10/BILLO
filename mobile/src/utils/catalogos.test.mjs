import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { validarApiUrl } from './apiUrl.js';
import { debeReintentar, vistaLista } from './estadoCarga.js';
import { estiloServicio, inicialServicio } from './membresias.js';

// HU-80: catálogos (categorías y catálogo de suscripciones) en Expo y en el APK.

describe('validarApiUrl', () => {
  test('sin valor es API_URL_FALTANTE, no una URL vacía muda', () => {
    for (const valor of [undefined, null, '', '   ']) {
      assert.deepEqual(validarApiUrl(valor), { url: '', error: 'API_URL_FALTANTE' });
    }
  });

  test('sin http(s):// es API_URL_INVALIDA', () => {
    for (const valor of ['192.168.1.126:3000', 'localhost', 'ftp://x', 'http://']) {
      assert.equal(validarApiUrl(valor).error, 'API_URL_INVALIDA', valor);
    }
  });

  test('una URL válida queda sin espacios ni diagonal final', () => {
    assert.deepEqual(validarApiUrl(' http://192.168.1.126:3000/ '), {
      url: 'http://192.168.1.126:3000',
      error: null,
    });
    assert.equal(validarApiUrl('https://api.billo.app//').url, 'https://api.billo.app');
  });
});

describe('vistaLista', () => {
  test('distingue cargando, error, vacío y lista', () => {
    assert.equal(vistaLista('cargando', []), 'cargando');
    assert.equal(vistaLista('inactivo', []), 'cargando');
    assert.equal(vistaLista('error', [{ id: 1 }]), 'error');
    assert.equal(vistaLista('listo', []), 'vacio');
    assert.equal(vistaLista('listo', null), 'vacio');
    assert.equal(vistaLista('listo', [{ id: 1 }]), 'lista');
  });
});

describe('debeReintentar', () => {
  test('solo reintenta lo que falló', () => {
    assert.equal(debeReintentar('error'), true);
    for (const estado of ['cargando', 'listo', 'inactivo']) {
      assert.equal(debeReintentar(estado), false, estado);
    }
  });
});

describe('respaldo de logo del catálogo', () => {
  test('un servicio sin ícono propio usa su inicial', () => {
    assert.equal(estiloServicio('Gimnasio Municipal').predefinido, false);
    assert.equal(inicialServicio('gimnasio Municipal'), 'G');
    assert.equal(inicialServicio('  ñu tv'), 'Ñ');
  });

  test('los servicios conocidos conservan su ícono', () => {
    assert.equal(estiloServicio('Netflix').predefinido, true);
  });

  test('sin nombre la inicial es "?"', () => {
    assert.equal(inicialServicio(''), '?');
    assert.equal(inicialServicio(undefined), '?');
  });
});
