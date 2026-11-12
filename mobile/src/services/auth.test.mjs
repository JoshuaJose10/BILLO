// Recuperar contraseña (HU-65) en services/auth: npm test
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.100:3000';
const { restablecerPassword, solicitarCodigo } = await import('./auth.js');

let llamadas;
let respuesta;
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  llamadas = [];
  respuesta = { ok: true, status: 200, json: async () => ({ enviado: true }) };
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url, metodo: opciones.method, body: JSON.parse(opciones.body) });
    return respuesta;
  };
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

describe('recuperar contraseña', () => {
  it('solicitarCodigo envía el correo normalizado', async () => {
    await solicitarCodigo('  Ana@Correo.com ');
    assert.deepEqual(llamadas, [
      {
        url: 'http://192.168.1.100:3000/auth/olvide-contrasena',
        metodo: 'POST',
        body: { email: 'ana@correo.com' },
      },
    ]);
  });

  it('restablecerPassword envía el código como token', async () => {
    await restablecerPassword('Ana@correo.com', '482910', 'NuevaPassword123');
    assert.equal(llamadas[0].url, 'http://192.168.1.100:3000/auth/restablecer-contrasena');
    assert.deepEqual(llamadas[0].body, {
      email: 'ana@correo.com',
      token: '482910',
      password: 'NuevaPassword123',
    });
  });

  it('propaga el código de error del contrato', async () => {
    respuesta = {
      ok: false,
      status: 429,
      json: async () => ({ error: { code: 'DEMASIADAS_SOLICITUDES', message: '' } }),
    };
    await assert.rejects(solicitarCodigo('ana@correo.com'), {
      code: 'DEMASIADAS_SOLICITUDES',
      status: 429,
    });
  });
});
