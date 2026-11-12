import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { vistaLista, vistaPantalla } from './estadoCarga.js';

// HU-69: qué estado se muestra según los datos y los errores (vistaLista ya se prueba en
// catalogos.test.mjs). npm test

describe('vistaPantalla', () => {
  test('primera carga: cargando y, si falla, error a pantalla completa', () => {
    assert.equal(vistaPantalla('cargando', false), 'cargando');
    assert.equal(vistaPantalla('error', false), 'error');
  });

  test('con datos a la vista, un error es un aviso y no tapa la pantalla', () => {
    assert.equal(vistaPantalla('error', true), 'aviso');
    assert.equal(vistaPantalla('cargando', true), 'datos');
    assert.equal(vistaPantalla('listo', true), 'datos');
  });

  test('una respuesta vacía cuenta como datos (su vacío lo pinta la pantalla), no como error', () => {
    assert.equal(vistaPantalla('listo', false), 'datos');
  });
});

describe('vacío y error son estados distintos', () => {
  test('una lista vacía tras un error sigue siendo error; tras cargar, vacío', () => {
    assert.equal(vistaLista('error', []), 'error');
    assert.equal(vistaLista('listo', []), 'vacio');
    assert.notEqual(vistaLista('error', []), vistaLista('listo', []));
  });
});
