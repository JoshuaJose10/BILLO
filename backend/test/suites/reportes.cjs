const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { expectError } = require('../helpers/fixtures.cjs');

module.exports = (getContext) =>
  describe('Reportes - Resumen mensual (RF6)', () => {
    let ctx;
    beforeEach(async () => {
      ctx = getContext();
      await ctx.reset();
    });

    it('CP-RF6-02: usuario nuevo sin gastos ni membresías devuelve ceros', async () => {
      const response = await ctx.api
        .get('/reportes/resumen?mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.deepEqual(response.body, {
        mes: '2026-10',
        gasto_variable: 0,
        gasto_fijo: 0,
        total: 0,
      });
    });

    it('CP-RF6-01: con gastos por 500 y membresías por 300 al mes devuelve 500, 300 y 800', async () => {
      // Gastos por 500 (dos gastos: 350 + 150)
      await ctx.crearGasto(ctx.a, { monto: 350, fecha: '2026-10-05' });
      await ctx.crearGasto(ctx.a, { monto: 150, fecha: '2026-10-18' });

      // Membresía mensual por 300
      await ctx.pool.query(
        `INSERT INTO membresias (usuario_id, nombre, costo, frecuencia, fecha_cobro)
         VALUES ($1, 'Gimnasio', 300, 'mensual', '2026-10-01')`,
        [ctx.a.usuario.id]
      );

      const response = await ctx.api
        .get('/reportes/resumen?mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.deepEqual(response.body, {
        mes: '2026-10',
        gasto_variable: 500,
        gasto_fijo: 300,
        total: 800,
      });
    });

    it('membresía anual de 1,200 aporta 100 al gasto fijo', async () => {
      await ctx.pool.query(
        `INSERT INTO membresias (usuario_id, nombre, costo, frecuencia, fecha_cobro)
         VALUES ($1, 'Platzi Anual', 1200, 'anual', '2026-05-15')`,
        [ctx.a.usuario.id]
      );

      const response = await ctx.api
        .get('/reportes/resumen?mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.deepEqual(response.body, {
        mes: '2026-10',
        gasto_variable: 0,
        gasto_fijo: 100,
        total: 100,
      });
    });

    it('suma mixta de membresías mensuales y anuales con redondeo a 2 decimales', async () => {
      // Mensual: 200 + Anual: 1200 (100) + Anual: 100 (8.3333...) => 200 + 100 + 8.33 = 308.33
      await ctx.pool.query(
        `INSERT INTO membresias (usuario_id, nombre, costo, frecuencia, fecha_cobro)
         VALUES 
           ($1, 'Membresía Mensual', 200, 'mensual', '2026-10-01'),
           ($1, 'Membresía Anual 1', 1200, 'anual', '2026-01-10'),
           ($1, 'Membresía Anual 2', 100, 'anual', '2026-02-15')`,
        [ctx.a.usuario.id]
      );

      // Gasto variable con decimales
      await ctx.crearGasto(ctx.a, { monto: 45.5, fecha: '2026-10-12' });

      const response = await ctx.api
        .get('/reportes/resumen?mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.deepEqual(response.body, {
        mes: '2026-10',
        gasto_variable: 45.5,
        gasto_fijo: 308.33,
        total: 353.83,
      });
    });

    it('los gastos de otros meses no se suman al gasto_variable', async () => {
      await ctx.crearGasto(ctx.a, { monto: 200, fecha: '2026-09-30' });
      await ctx.crearGasto(ctx.a, { monto: 300, fecha: '2026-10-01' });
      await ctx.crearGasto(ctx.a, { monto: 400, fecha: '2026-11-01' });

      const response = await ctx.api
        .get('/reportes/resumen?mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.equal(response.body.gasto_variable, 300);
      assert.equal(response.body.total, 300);
    });

    it('aislamiento: el usuario A no suma datos del usuario B', async () => {
      // Datos de A
      await ctx.crearGasto(ctx.a, { monto: 150, fecha: '2026-10-10' });
      await ctx.pool.query(
        `INSERT INTO membresias (usuario_id, nombre, costo, frecuencia, fecha_cobro)
         VALUES ($1, 'Spotify A', 129, 'mensual', '2026-10-05')`,
        [ctx.a.usuario.id]
      );

      // Datos de B
      await ctx.crearGasto(ctx.b, { monto: 999, fecha: '2026-10-10' });
      await ctx.pool.query(
        `INSERT INTO membresias (usuario_id, nombre, costo, frecuencia, fecha_cobro)
         VALUES ($1, 'Netflix B', 299, 'mensual', '2026-10-05')`,
        [ctx.b.usuario.id]
      );

      const resA = await ctx.api
        .get('/reportes/resumen?mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.deepEqual(resA.body, {
        mes: '2026-10',
        gasto_variable: 150,
        gasto_fijo: 129,
        total: 279,
      });

      const resB = await ctx.api
        .get('/reportes/resumen?mes=2026-10')
        .auth(ctx.b.token, { type: 'bearer' })
        .expect(200);

      assert.deepEqual(resB.body, {
        mes: '2026-10',
        gasto_variable: 999,
        gasto_fijo: 299,
        total: 1298,
      });
    });

    it('mes obligatorio: responde 400 MES_INVALIDO cuando no se envía mes', async () => {
      const response = await ctx.api
        .get('/reportes/resumen')
        .auth(ctx.a.token, { type: 'bearer' });

      expectError(response, 400, 'MES_INVALIDO');
    });

    for (const mesInvalido of [
      '',
      '2026',
      '2026-1',
      '2026-13',
      '2026-00',
      '2026/10',
      'incorrecto',
      '2026-10-01',
    ]) {
      it(`mes mal escrito (${JSON.stringify(mesInvalido)}) responde 400 MES_INVALIDO`, async () => {
        const response = await ctx.api
          .get(`/reportes/resumen?mes=${encodeURIComponent(mesInvalido)}`)
          .auth(ctx.a.token, { type: 'bearer' });

        expectError(response, 400, 'MES_INVALIDO');
      });
    }

    it('requiere autenticación: responde 401 NO_AUTORIZADO sin token', async () => {
      const response = await ctx.api.get('/reportes/resumen?mes=2026-10');
      expectError(response, 401, 'NO_AUTORIZADO');
    });

    it('requiere autenticación: responde 401 NO_AUTORIZADO con token inválido', async () => {
      const response = await ctx.api
        .get('/reportes/resumen?mes=2026-10')
        .auth('token_invalido', { type: 'bearer' });
      expectError(response, 401, 'NO_AUTORIZADO');
    });
  });

