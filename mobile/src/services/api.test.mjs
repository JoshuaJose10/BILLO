// apiFetch: guardia del modo exploración (HU-50), timeout y errores de servidor (HU-69). npm test
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

// config/api.js lee la URL al importarse.
process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.100:3000';
const { apiFetch, MODO_VISITANTE, SIN_CONEXION, setModoVisitante } = await import('./api.js');
const { TIMEOUT_MS } = await import('../config/api.js');

let llamadas;
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  llamadas = [];
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
});

afterEach(() => {
  mock.timers.reset();
  setModoVisitante(false);
  globalThis.fetch = fetchOriginal;
});

describe('apiFetch en modo exploración', () => {
  it('lanza MODO_VISITANTE sin hacer ninguna petición', async () => {
    setModoVisitante(true);
    await assert.rejects(apiFetch('/gastos?mes=2026-11'), { code: MODO_VISITANTE, status: 0 });
    // Como el registro del token push (HU-47): POST con token.
    await assert.rejects(
      apiFetch('/notificaciones/token', {
        method: 'POST',
        body: { expo_push_token: 'ExponentPushToken[abc]' },
        token: 'jwt',
      }),
      { code: MODO_VISITANTE },
    );
    await assert.rejects(apiFetch('/auth/login', { method: 'POST', body: {} }), {
      code: MODO_VISITANTE,
    });
    assert.equal(llamadas.length, 0);
  });

  it('al salir del modo vuelve a llamar a la API', async () => {
    setModoVisitante(true);
    await assert.rejects(apiFetch('/categorias'));
    setModoVisitante(false);
    assert.deepEqual(await apiFetch('/categorias'), { ok: true });
    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].url, 'http://192.168.1.100:3000/categorias');
  });
});

// fetch que no responde hasta que se aborta su signal, como con una IP inaccesible.
const fetchColgado = async (url, { signal }) =>
  new Promise((_, rechazar) => {
    signal.addEventListener('abort', () => rechazar(new Error('AbortError')));
  });

const respuesta = (status, cuerpo) => ({
  ok: status < 400,
  status,
  json: async () => {
    if (cuerpo === undefined) throw new SyntaxError('sin JSON');
    return cuerpo;
  },
});

describe('apiFetch: timeout y errores de red', () => {
  it('aborta al vencer TIMEOUT_MS (15 s) con SIN_CONEXION', async () => {
    assert.equal(TIMEOUT_MS, 15000);
    mock.timers.enable({ apis: ['setTimeout'] });
    globalThis.fetch = fetchColgado;
    let resultado = null;
    const peticion = apiFetch('/gastos').catch((e) => (resultado = e));
    mock.timers.tick(TIMEOUT_MS - 1);
    await Promise.resolve();
    assert.equal(resultado, null);
    mock.timers.tick(1);
    await peticion;
    assert.deepEqual(resultado, { code: SIN_CONEXION, message: '', status: 0 });
  });

  it('respeta el signal de quien llama (HU-47)', async () => {
    globalThis.fetch = fetchColgado;
    const controller = new AbortController();
    const peticion = apiFetch('/gastos', { signal: controller.signal });
    controller.abort();
    await assert.rejects(peticion, { code: SIN_CONEXION });
  });

  it('servidor apagado (fetch rechaza) → SIN_CONEXION', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('Network request failed');
    };
    await assert.rejects(apiFetch('/gastos'), { code: SIN_CONEXION, status: 0 });
  });

  it('5xx genérico → SIN_CONEXION; 5xx con código propio lo conserva', async () => {
    globalThis.fetch = async () =>
      respuesta(500, { error: { code: 'ERROR_SERVIDOR', message: 'x' } });
    await assert.rejects(apiFetch('/gastos'), { code: SIN_CONEXION, status: 500 });

    globalThis.fetch = async () => respuesta(503); // HTML del proxy, sin JSON
    await assert.rejects(apiFetch('/gastos'), { code: SIN_CONEXION, status: 503 });

    globalThis.fetch = async () =>
      respuesta(502, { error: { code: 'FUENTE_NO_DISPONIBLE', message: '' } });
    await assert.rejects(apiFetch('/divisas'), { code: 'FUENTE_NO_DISPONIBLE', status: 502 });
  });

  it('4xx conserva su código', async () => {
    globalThis.fetch = async () =>
      respuesta(400, { error: { code: 'MES_INVALIDO', message: 'Mes' } });
    await assert.rejects(apiFetch('/gastos'), { code: 'MES_INVALIDO', message: 'Mes' });
  });
});
