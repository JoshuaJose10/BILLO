// Pruebas de utils/notificaciones.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  crearVinculoPush,
  describirFallo,
  destinoNotificacion,
  esTokenPushValido,
  permisoPushConcedido,
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

// Promesa que el test resuelve o rechaza cuando quiere (respuesta lenta del backend o del permiso).
function diferida() {
  let resolve;
  let reject;
  const promesa = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promesa, resolve, reject };
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Backend falso con las reglas reales: POST transfiere el token entre cuentas y DELETE solo borra
// si coincide con el del usuario. Las sesiones son los JWT 'jwt-a' y 'jwt-b'.
function backendFalso() {
  const duenos = new Map();
  const llamadas = [];
  return {
    duenos,
    llamadas,
    registrar: async (token, sesion) => {
      llamadas.push(['POST', token, sesion]);
      for (const [s, t] of duenos) if (t === token && s !== sesion) duenos.set(s, null);
      duenos.set(sesion, token);
      return { registrado: true };
    },
    eliminar: async (token, sesion) => {
      llamadas.push(['DELETE', token, sesion]);
      if (duenos.get(sesion) === token) duenos.set(sesion, null);
      return { eliminado: true };
    },
  };
}

describe('crearVinculoPush: registro', () => {
  it('con token válido lo manda con la sesión y lo devuelve', async () => {
    const api = backendFalso();
    const vinculo = crearVinculoPush({ obtenerToken: async () => TOKEN, ...api });
    assert.equal(await vinculo.iniciar('jwt-a'), TOKEN);
    assert.deepEqual(api.llamadas, [['POST', TOKEN, 'jwt-a']]);
  });

  it('sin sesión no hace nada', async () => {
    const api = backendFalso();
    const vinculo = crearVinculoPush({ obtenerToken: async () => TOKEN, ...api });
    assert.equal(await vinculo.iniciar(null), null);
    assert.deepEqual(api.llamadas, []);
  });

  it('una vez por sesión: repetir la misma sesión no vuelve a registrar', async () => {
    const api = backendFalso();
    const vinculo = crearVinculoPush({ obtenerToken: async () => TOKEN, ...api });
    await Promise.all([vinculo.iniciar('jwt-a'), vinculo.iniciar('jwt-a')]);
    assert.equal(await vinculo.iniciar('jwt-a'), TOKEN);
    assert.equal(api.llamadas.length, 1);
  });

  it('sin permiso, simulador o Expo Go (token null) no llama al backend', async () => {
    const api = backendFalso();
    const vinculo = crearVinculoPush({ obtenerToken: async () => null, ...api });
    assert.equal(await vinculo.iniciar('jwt-a'), null);
    assert.deepEqual(api.llamadas, []);
  });

  it('si obtener el token falla no lanza y avisa', async () => {
    const avisos = [];
    const vinculo = crearVinculoPush({
      obtenerToken: async () => {
        throw new Error('sin FCM');
      },
      registrar: async () => assert.fail('no debe registrar'),
      eliminar: async () => assert.fail('no debe eliminar'),
      avisar: (etapa, e) => avisos.push(`${etapa} ${e.message}`),
    });
    assert.equal(await vinculo.iniciar('jwt-a'), null);
    assert.deepEqual(avisos, ['token sin FCM']);
  });

  it('un error del backend (TOKEN_PUSH_INVALIDO, sin conexión) no lanza', async () => {
    for (const code of ['TOKEN_PUSH_INVALIDO', 'SIN_CONEXION', 'ERROR_SERVIDOR']) {
      const avisos = [];
      const vinculo = crearVinculoPush({
        obtenerToken: async () => TOKEN,
        registrar: async () => {
          throw { code, message: '', status: 400 };
        },
        eliminar: async () => {},
        avisar: (etapa, e) => avisos.push(`${etapa} ${e.code}`),
      });
      assert.equal(await vinculo.iniciar('jwt-a'), null);
      assert.deepEqual(avisos, [`registro ${code}`]);
    }
  });
});

describe('crearVinculoPush: cerrar sesión y cambio de cuenta', () => {
  it('logout después de registrar llama DELETE con el token y la sesión vigente', async () => {
    const api = backendFalso();
    const vinculo = crearVinculoPush({ obtenerToken: async () => TOKEN, ...api });
    await vinculo.iniciar('jwt-a');
    await vinculo.desvincular('jwt-a');

    assert.deepEqual(api.llamadas.at(-1), ['DELETE', TOKEN, 'jwt-a']);
    assert.equal(api.duenos.get('jwt-a'), null);
  });

  it('logout sin token registrado (permiso negado) no llama DELETE', async () => {
    const api = backendFalso();
    const vinculo = crearVinculoPush({ obtenerToken: async () => null, ...api });
    await vinculo.iniciar('jwt-a');
    await vinculo.desvincular('jwt-a');
    assert.deepEqual(api.llamadas, []);
  });

  it('logout con registro pendiente: espera el POST y luego desvincula', async () => {
    const api = backendFalso();
    const post = diferida();
    const vinculo = crearVinculoPush({
      obtenerToken: async () => TOKEN,
      registrar: async (...args) => {
        await post.promesa;
        return api.registrar(...args);
      },
      eliminar: api.eliminar,
      topeMs: 200,
    });
    vinculo.iniciar('jwt-a');
    const cierre = vinculo.desvincular('jwt-a');
    await esperar(20);
    post.resolve();
    await cierre;

    assert.deepEqual(api.llamadas, [
      ['POST', TOKEN, 'jwt-a'],
      ['DELETE', TOKEN, 'jwt-a'],
    ]);
    assert.equal(api.duenos.get('jwt-a'), null);
  });

  it('logout con POST que no responde: tras el tope lo aborta y desvincula igual', async () => {
    const llamadas = [];
    let senalPost;
    const vinculo = crearVinculoPush({
      obtenerToken: async () => TOKEN,
      registrar: (token, sesion, signal) => {
        senalPost = signal;
        return new Promise(() => {});
      },
      eliminar: async (token, sesion) => llamadas.push(['DELETE', token, sesion]),
      topeMs: 30,
    });
    vinculo.iniciar('jwt-a');
    await esperar(5);
    const inicio = Date.now();
    await vinculo.desvincular('jwt-a');

    assert.ok(Date.now() - inicio < 500);
    assert.equal(senalPost.aborted, true);
    assert.deepEqual(llamadas, [['DELETE', TOKEN, 'jwt-a']]);
  });

  it('logout mientras espera el permiso: el token que llega tarde no se registra', async () => {
    const api = backendFalso();
    const permiso = diferida();
    const vinculo = crearVinculoPush({
      obtenerToken: () => permiso.promesa,
      ...api,
      topeMs: 20,
    });
    const registro = vinculo.iniciar('jwt-a');
    await vinculo.desvincular('jwt-a');
    permiso.resolve(TOKEN);

    assert.equal(await registro, null);
    assert.deepEqual(api.llamadas, []);
  });

  it('DELETE que falla o no responde: el logout termina igual, sin lanzar', async () => {
    for (const eliminar of [
      async () => {
        throw { code: 'SIN_CONEXION', message: '', status: 0 };
      },
      () => new Promise(() => {}),
    ]) {
      const avisos = [];
      const vinculo = crearVinculoPush({
        obtenerToken: async () => TOKEN,
        registrar: async () => {},
        eliminar,
        avisar: (etapa) => avisos.push(etapa),
        topeMs: 30,
      });
      await vinculo.iniciar('jwt-a');
      await vinculo.desvincular('jwt-a');
      // Una sesión nueva se registra normalmente después.
      assert.equal(await vinculo.iniciar('jwt-b'), TOKEN);
      assert.ok(avisos.every((etapa) => etapa === 'desvinculo'));
    }
  });

  it('cambio A → B con logout: A no queda con el token y B sí', async () => {
    const api = backendFalso();
    const vinculo = crearVinculoPush({ obtenerToken: async () => TOKEN, ...api });
    await vinculo.iniciar('jwt-a');
    await vinculo.desvincular('jwt-a');
    await vinculo.iniciar('jwt-b');

    assert.equal(api.duenos.get('jwt-a'), null);
    assert.equal(api.duenos.get('jwt-b'), TOKEN);
  });

  it('cambio A → B sin logout: B transfiere el token y desvincular A ya no toca a B', async () => {
    const api = backendFalso();
    const vinculo = crearVinculoPush({ obtenerToken: async () => TOKEN, ...api });
    await vinculo.iniciar('jwt-a');
    await vinculo.iniciar('jwt-b');
    await vinculo.desvincular('jwt-a');

    assert.equal(api.duenos.get('jwt-a'), null);
    assert.equal(api.duenos.get('jwt-b'), TOKEN);
    assert.ok(!api.llamadas.some(([m, , s]) => m === 'DELETE' && s === 'jwt-b'));
  });

  it('respuesta tardía de la sesión anterior: se aborta, se ignora y no pisa a B', async () => {
    const postA = diferida();
    let senalA;
    const vinculo = crearVinculoPush({
      obtenerToken: async () => TOKEN,
      registrar: (token, sesion, signal) => {
        if (sesion === 'jwt-a') {
          senalA = signal;
          return postA.promesa;
        }
        return Promise.resolve();
      },
      eliminar: async () => {},
    });
    const registroA = vinculo.iniciar('jwt-a');
    await esperar(5);
    assert.equal(await vinculo.iniciar('jwt-b'), TOKEN);
    assert.equal(senalA.aborted, true);

    postA.resolve({ registrado: true });
    assert.equal(await registroA, null);
    // B sigue siendo la sesión registrada.
    assert.equal(await vinculo.iniciar('jwt-b'), TOKEN);
  });

  it('descartar (sesión vencida) olvida el registro sin llamar al backend', async () => {
    const api = backendFalso();
    const vinculo = crearVinculoPush({ obtenerToken: async () => TOKEN, ...api });
    await vinculo.iniciar('jwt-a');
    vinculo.descartar();
    await vinculo.desvincular('jwt-a');
    assert.deepEqual(api.llamadas, [['POST', TOKEN, 'jwt-a']]);
  });
});

// Sistema operativo falso: recuerda la respuesta del usuario entre sesiones y cuenta los diálogos.
function sistemaFalso(estado, { canAskAgain = true, respuesta = 'granted' } = {}) {
  const so = {
    dialogos: 0,
    consultar: async () => ({ status: estado, canAskAgain }),
    pedir: async () => {
      so.dialogos++;
      estado = respuesta;
      return { status: estado, canAskAgain };
    },
  };
  return so;
}

describe('permisoPushConcedido', () => {
  it('undetermined: pregunta una vez y en la siguiente sesión ya no', async () => {
    const so = sistemaFalso('undetermined');
    assert.equal(await permisoPushConcedido(so), true);
    assert.equal(await permisoPushConcedido(so), true);
    assert.equal(so.dialogos, 1);
  });

  it('undetermined y el usuario lo niega: no vuelve a preguntar en la siguiente sesión', async () => {
    const so = sistemaFalso('undetermined', { respuesta: 'denied' });
    assert.equal(await permisoPushConcedido(so), false);
    assert.equal(await permisoPushConcedido(so), false);
    assert.equal(so.dialogos, 1);
  });

  it('denied con canAskAgain true: no pregunta (dos sesiones seguidas)', async () => {
    const so = sistemaFalso('denied', { canAskAgain: true });
    assert.equal(await permisoPushConcedido(so), false);
    assert.equal(await permisoPushConcedido(so), false);
    assert.equal(so.dialogos, 0);
  });

  it('denied con canAskAgain false: no pregunta', async () => {
    const so = sistemaFalso('denied', { canAskAgain: false });
    assert.equal(await permisoPushConcedido(so), false);
    assert.equal(so.dialogos, 0);
  });

  it('granted: sigue sin preguntar', async () => {
    const so = sistemaFalso('granted');
    assert.equal(await permisoPushConcedido(so), true);
    assert.equal(so.dialogos, 0);
  });
});

describe('describirFallo', () => {
  it('error de la API: etapa, code y message', () => {
    assert.equal(
      describirFallo('registro', {
        code: 'TOKEN_PUSH_INVALIDO',
        message: 'El token de notificaciones push no es válido',
        status: 400,
      }),
      '[notificaciones] registro: TOKEN_PUSH_INVALIDO El token de notificaciones push no es válido',
    );
  });

  it('error de la API sin message: usa el estado HTTP', () => {
    assert.equal(
      describirFallo('registro', { code: 'ERROR_DESCONOCIDO', message: '', status: 502 }),
      '[notificaciones] registro: ERROR_DESCONOCIDO HTTP 502',
    );
  });

  it('error de Expo con code', () => {
    const error = Object.assign(new Error('Default FirebaseApp is not initialized'), {
      code: 'E_REGISTRATION_FAILED',
    });
    assert.equal(
      describirFallo('token', error),
      '[notificaciones] token: E_REGISTRATION_FAILED Default FirebaseApp is not initialized',
    );
  });

  it('Error sin code usa su nombre; un valor suelto se imprime tal cual', () => {
    assert.equal(
      describirFallo('token', new TypeError('x is undefined')),
      '[notificaciones] token: TypeError x is undefined',
    );
    assert.equal(describirFallo('token', 'raro'), '[notificaciones] token: ERROR raro');
    assert.equal(describirFallo('token', undefined), '[notificaciones] token: ERROR');
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
