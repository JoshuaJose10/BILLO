import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { avisoVisible, intentar, vistaLista, vistaPantalla } from './estadoCarga.js';

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

describe('intentar (Reintentar y jalar para recargar)', () => {
  // Registra las fases como lo hace useIntento: reintentando entre alEmpezar y alTerminar.
  const registrar = () => {
    const r = { fases: [], reintentando: false };
    r.callbacks = {
      alEmpezar: () => {
        r.reintentando = true;
        r.fases.push('empezar');
      },
      alTerminar: (ok) => {
        r.reintentando = false;
        r.fases.push(`terminar:${ok}`);
      },
    };
    return r;
  };

  test('sigue reintentando mientras la carga no responde', async () => {
    const r = registrar();
    let responder;
    const pendiente = intentar(() => new Promise((res) => (responder = res)), r.callbacks);
    assert.equal(r.reintentando, true);
    await Promise.resolve();
    assert.equal(r.reintentando, true);
    responder(true);
    assert.equal(await pendiente, true);
    assert.equal(r.reintentando, false);
    assert.deepEqual(r.fases, ['empezar', 'terminar:true']);
  });

  test('un fallo termina en false (devuelto o lanzado)', async () => {
    const r = registrar();
    assert.equal(await intentar(async () => false, r.callbacks), false);
    assert.equal(
      await intentar(async () => {
        throw new Error('red');
      }, r.callbacks),
      false,
    );
    assert.deepEqual(r.fases, ['empezar', 'terminar:false', 'empezar', 'terminar:false']);
  });

  test('una tarea sin resultado (la pantalla pinta su cargando) no es éxito ni fallo', async () => {
    const r = registrar();
    assert.equal(await intentar(() => {}, r.callbacks), undefined);
    assert.deepEqual(r.fases, ['empezar', 'terminar:undefined']);
  });
});

describe('avisoVisible', () => {
  test('solo con error, datos a la vista y sin cerrar', () => {
    assert.equal(avisoVisible({ error: 'Sin conexión', hayDatos: true, cerrado: false }), true);
    assert.equal(avisoVisible({ error: 'Sin conexión', hayDatos: false, cerrado: false }), false);
    assert.equal(avisoVisible({ error: 'Sin conexión', hayDatos: true, cerrado: true }), false);
    assert.equal(avisoVisible({ error: null, hayDatos: true, cerrado: false }), false);
  });
});
