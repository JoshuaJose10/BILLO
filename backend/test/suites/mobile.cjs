const assert = require('node:assert/strict');
const { once } = require('node:events');
const { describe, it, before, beforeEach, after } = require('node:test');

// Ejecuta el cliente HTTP que usa Expo contra Express y PostgreSQL reales.
// No sustituye las pruebas de interfaz ni de módulos nativos en dispositivo.
module.exports = (getContext) =>
  describe('Cliente mobile + API real', () => {
    let ctx;
    let server;
    let cliente;
    let auth;
    const urlAnterior = process.env.EXPO_PUBLIC_API_URL;

    before(async () => {
      ctx = getContext();
      server = ctx.app.listen(0, '127.0.0.1');
      await once(server, 'listening');
      process.env.EXPO_PUBLIC_API_URL = `http://127.0.0.1:${server.address().port}/`;
      cliente = await import('../../../mobile/src/services/api.js');
      auth = await import('../../../mobile/src/services/auth.js');
    });

    beforeEach(async () => {
      cliente.setAlNoAutorizado(null);
      await ctx.reset();
    });

    after(async () => {
      cliente?.setAlNoAutorizado(null);
      if (urlAnterior === undefined) delete process.env.EXPO_PUBLIC_API_URL;
      else process.env.EXPO_PUBLIC_API_URL = urlAnterior;
      if (server) {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    });

    it('registra e inicia sesión con el cliente móvil y consulta el perfil con su JWT', async () => {
      const registro = await auth.registrar('  Mobile QA  ', ' MOBILE@example.com ', ctx.password);
      assert.equal(registro.usuario.nombre, 'Mobile QA');
      assert.equal(registro.usuario.email, 'mobile@example.com');
      assert.equal(typeof registro.token, 'string');
      assert.equal(registro.usuario.password_hash, undefined);

      const sesion = await auth.login(' MOBILE@EXAMPLE.COM ', ctx.password);
      const perfil = await cliente.apiFetch('/auth/perfil', { token: sesion.token });
      assert.equal(perfil.id, registro.usuario.id);
      assert.equal(perfil.email, registro.usuario.email);
    });

    it('crea, consulta, modifica y elimina un gasto mediante fetch y actualiza el resumen', async () => {
      const token = ctx.a.token;
      const { gasto } = await cliente.apiFetch('/gastos', {
        method: 'POST',
        token,
        body: ctx.gasto({ monto: 80.5 }),
      });
      const gastos = await cliente.apiFetch('/gastos?mes=2026-10', { token });
      assert.equal(gastos.length, 1);
      assert.equal(gastos[0].id, gasto.id);
      assert.equal(Number(gastos[0].monto), 80.5);
      const persistido = await ctx.pool.query('SELECT monto FROM gastos WHERE id = $1', [gasto.id]);
      assert.equal(Number(persistido.rows[0].monto), 80.5);

      await cliente.apiFetch(`/gastos/${gasto.id}`, {
        method: 'PUT',
        token,
        body: ctx.gasto({ monto: 125.75 }),
      });
      const resumen = await cliente.apiFetch('/reportes/resumen?mes=2026-10', { token });
      assert.equal(resumen.gasto_variable, 125.75);
      assert.equal(resumen.total, 125.75);
      assert.deepEqual(await cliente.apiFetch(`/gastos/${gasto.id}`, { method: 'DELETE', token }), {
        eliminado: true,
      });
      assert.deepEqual(await cliente.apiFetch('/gastos?mes=2026-10', { token }), []);
    });

    it('conserva el aislamiento A/B al enviar el token desde mobile', async () => {
      const gasto = await ctx.crearGasto();
      assert.deepEqual(await cliente.apiFetch('/gastos?mes=2026-10', { token: ctx.b.token }), []);
      await assert.rejects(
        cliente.apiFetch(`/gastos/${gasto.id}`, { method: 'DELETE', token: ctx.b.token }),
        { code: 'GASTO_NO_ENCONTRADO', status: 404 },
      );
      assert.equal((await ctx.listar()).length, 1);
    });

    it('propaga un error 400 estructurado sin guardar datos ni cerrar la sesión', async () => {
      let cierres = 0;
      cliente.setAlNoAutorizado(() => cierres++);
      await assert.rejects(
        cliente.apiFetch('/gastos', {
          method: 'POST',
          token: ctx.a.token,
          body: ctx.gasto({ monto: '80.50' }),
        }),
        { code: 'MONTO_INVALIDO', status: 400 },
      );
      assert.equal(cierres, 0);
      assert.deepEqual(await ctx.listar(), []);
    });

    it('notifica un 401 autenticado con el token rechazado para cerrar la sesión correcta', async () => {
      const rechazados = [];
      cliente.setAlNoAutorizado((token) => rechazados.push(token));
      await assert.rejects(cliente.apiFetch('/auth/perfil', { token: 'token-invalido' }), {
        code: 'NO_AUTORIZADO',
        status: 401,
      });
      assert.deepEqual(rechazados, ['token-invalido']);
    });

    it('un login incorrecto propaga el 401 sin cerrar otra sesión existente', async () => {
      let cierres = 0;
      cliente.setAlNoAutorizado(() => cierres++);
      await assert.rejects(auth.login(ctx.a.usuario.email, 'incorrecta'), {
        code: 'CREDENCIALES_INVALIDAS',
        status: 401,
      });
      assert.equal(cierres, 0);
    });
  });
