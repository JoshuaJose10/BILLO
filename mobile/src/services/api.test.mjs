// Guardia de red del modo exploración (HU-50) en apiFetch: npm test
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

// config/api.js lee la URL al importarse.
process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.100:3000';
const { apiFetch, MODO_VISITANTE, setModoVisitante } = await import('./api.js');

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
