const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { expectError } = require('../helpers/fixtures.cjs');

const MIGRACION_021 = fs.readFileSync(
  path.resolve(__dirname, '../../migrations/021_tarjetas.sql'),
  'utf8'
);

module.exports = (getContext) =>
  describe('Tarjetas (feature/api-tarjetas / Migración 021)', () => {
    let ctx;
    beforeEach(async () => {
      ctx = getContext();
      await ctx.reset();
    });

    const payloadTarjeta = (overrides = {}) => ({
      nombre: 'BBVA Azul',
      tipo: 'credito',
      ultimos4: '4821',
      dia_corte: 12,
      dia_pago: 2,
      ...overrides,
    });

    const crearTarjeta = async (user = ctx.a, overrides = {}) => {
      const { body } = await ctx.api
        .post('/tarjetas')
        .auth(user.token, { type: 'bearer' })
        .send(payloadTarjeta(overrides))
        .expect(201);
      return body.tarjeta;
    };

    it('Migración 021: crea la tabla tarjetas, agrega tarjeta_id en gastos y membresias y es idempotente', async () => {
      const { rows: cols } = await ctx.pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'tarjetas'
        ORDER BY column_name
      `);
      assert.deepEqual(
        cols.map((c) => c.column_name),
        [
          'creada_en',
          'dia_corte',
          'dia_pago',
          'id',
          'nombre',
          'tipo',
          'ultimos4',
          'usuario_id',
        ]
      );

      const { rows: fk } = await ctx.pool.query(`
        SELECT tc.table_name, rc.delete_rule
        FROM information_schema.referential_constraints rc
        INNER JOIN information_schema.table_constraints tc
          ON rc.constraint_name = tc.constraint_name
        INNER JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_schema = 'public'
          AND (
            (tc.table_name = 'tarjetas' AND kcu.column_name = 'usuario_id')
            OR (tc.table_name IN ('gastos', 'membresias') AND kcu.column_name = 'tarjeta_id')
          )
        ORDER BY tc.table_name
      `);
      assert.deepEqual(fk, [
        { table_name: 'gastos', delete_rule: 'SET NULL' },
        { table_name: 'membresias', delete_rule: 'SET NULL' },
        { table_name: 'tarjetas', delete_rule: 'CASCADE' },
      ]);

      const t = await crearTarjeta(ctx.a);
      await ctx.pool.query(MIGRACION_021);
      await ctx.pool.query(MIGRACION_021);

      const { body: lista } = await ctx.api
        .get('/tarjetas')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.equal(lista.length, 1);
      assert.equal(lista[0].id, t.id);
    });

    it('CRUD completo de tarjetas (crédito y débito) para el usuario autenticado', async () => {
      const { body: vacia } = await ctx.api
        .get('/tarjetas')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.deepEqual(vacia, []);

      const credito = await crearTarjeta(ctx.a, {
        nombre: '  Nu Crédito  ',
        tipo: 'credito',
        ultimos4: '0492',
        dia_corte: 15,
        dia_pago: 5,
      });
      assert.equal(typeof credito.id, 'number');
      assert.equal(credito.nombre, 'Nu Crédito');
      assert.equal(credito.tipo, 'credito');
      assert.equal(credito.ultimos4, '0492');
      assert.equal(credito.dia_corte, 15);
      assert.equal(credito.dia_pago, 5);
      assert.equal(typeof credito.creada_en, 'string');

      const debito = await crearTarjeta(ctx.a, {
        nombre: 'Santander Débito',
        tipo: 'debito',
        ultimos4: '9910',
        dia_corte: undefined,
        dia_pago: undefined,
      });
      assert.equal(debito.tipo, 'debito');
      assert.equal(debito.dia_corte, null);
      assert.equal(debito.dia_pago, null);

      const { body: lista } = await ctx.api
        .get('/tarjetas')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.deepEqual(
        lista.map((x) => x.id),
        [credito.id, debito.id]
      );

      // Editar tarjeta
      const { body: editBody } = await ctx.api
        .put(`/tarjetas/${credito.id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          nombre: 'Nu Platinum',
          tipo: 'credito',
          ultimos4: '7788',
          dia_corte: 20,
          dia_pago: 10,
        })
        .expect(200);
      assert.equal(editBody.tarjeta.id, credito.id);
      assert.equal(editBody.tarjeta.nombre, 'Nu Platinum');
      assert.equal(editBody.tarjeta.ultimos4, '7788');
      assert.equal(editBody.tarjeta.dia_corte, 20);
      assert.equal(editBody.tarjeta.dia_pago, 10);

      // Eliminar tarjeta
      const { body: delBody } = await ctx.api
        .delete(`/tarjetas/${debito.id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.deepEqual(delBody, { eliminado: true });

      expectError(
        await ctx.api
          .delete(`/tarjetas/${debito.id}`)
          .auth(ctx.a.token, { type: 'bearer' }),
        404,
        'TARJETA_NO_ENCONTRADA'
      );
    });

    it('Privacidad A/B: un usuario no ve, edita, elimina ni consulta resumen de tarjetas ajenas (404 TARJETA_NO_ENCONTRADA)', async () => {
      const tarjetaA = await crearTarjeta(ctx.a);
      const tarjetaB = await crearTarjeta(ctx.b, {
        nombre: 'Banamex B',
        ultimos4: '1122',
      });

      const { body: listaA } = await ctx.api
        .get('/tarjetas')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.deepEqual(
        listaA.map((t) => t.id),
        [tarjetaA.id]
      );

      expectError(
        await ctx.api
          .put(`/tarjetas/${tarjetaA.id}`)
          .auth(ctx.b.token, { type: 'bearer' })
          .send(payloadTarjeta({ nombre: 'Intruso' })),
        404,
        'TARJETA_NO_ENCONTRADA'
      );

      expectError(
        await ctx.api
          .delete(`/tarjetas/${tarjetaA.id}`)
          .auth(ctx.b.token, { type: 'bearer' }),
        404,
        'TARJETA_NO_ENCONTRADA'
      );

      expectError(
        await ctx.api
          .get(`/tarjetas/${tarjetaA.id}/resumen?mes=2026-10`)
          .auth(ctx.b.token, { type: 'bearer' }),
        404,
        'TARJETA_NO_ENCONTRADA'
      );

      for (const idInvalido of ['abc', '0', '-5', '999999']) {
        expectError(
          await ctx.api
            .put(`/tarjetas/${idInvalido}`)
            .auth(ctx.a.token, { type: 'bearer' })
            .send(payloadTarjeta()),
          404,
          'TARJETA_NO_ENCONTRADA'
        );
        expectError(
          await ctx.api
            .delete(`/tarjetas/${idInvalido}`)
            .auth(ctx.a.token, { type: 'bearer' }),
          404,
          'TARJETA_NO_ENCONTRADA'
        );
      }

      // Verificar que tarjetaB tampoco fue alterada
      const { body: listaB } = await ctx.api
        .get('/tarjetas')
        .auth(ctx.b.token, { type: 'bearer' })
        .expect(200);
      assert.equal(listaB.length, 1);
      assert.equal(listaB[0].id, tarjetaB.id);
    });

    for (const method of ['post', 'put']) {
      for (const [caso, patch, codigoEsperado] of [
        ['sin cuerpo', undefined, 'TARJETA_INVALIDA'],
        ['nombre vacío', { nombre: '' }, 'TARJETA_INVALIDA'],
        ['nombre solo espacios', { nombre: '   ' }, 'TARJETA_INVALIDA'],
        ['nombre no string', { nombre: 123 }, 'TARJETA_INVALIDA'],
        ['nombre mayor a 100 caracteres', { nombre: 'a'.repeat(101) }, 'TARJETA_INVALIDA'],
        ['tipo inválido', { tipo: 'prepago' }, 'TARJETA_INVALIDA'],
        ['tipo ausente', { tipo: null }, 'TARJETA_INVALIDA'],
        ['ultimos4 con 3 dígitos', { ultimos4: '123' }, 'ULTIMOS4_INVALIDOS'],
        ['ultimos4 con 5 dígitos', { ultimos4: '12345' }, 'ULTIMOS4_INVALIDOS'],
        ['ultimos4 con letras', { ultimos4: '12a4' }, 'ULTIMOS4_INVALIDOS'],
        ['ultimos4 numérico en vez de string', { ultimos4: 1234 }, 'ULTIMOS4_INVALIDOS'],
        ['ultimos4 vacío', { ultimos4: '' }, 'ULTIMOS4_INVALIDOS'],
        ['dia_corte cero', { dia_corte: 0 }, 'TARJETA_INVALIDA'],
        ['dia_corte 32', { dia_corte: 32 }, 'TARJETA_INVALIDA'],
        ['dia_corte decimal', { dia_corte: 10.5 }, 'TARJETA_INVALIDA'],
        ['dia_corte string', { dia_corte: '10' }, 'TARJETA_INVALIDA'],
        ['dia_pago negativo', { dia_pago: -1 }, 'TARJETA_INVALIDA'],
        ['dia_pago 32', { dia_pago: 32 }, 'TARJETA_INVALIDA'],
        ['dia_pago string', { dia_pago: '5' }, 'TARJETA_INVALIDA'],
      ]) {
        it(`${method.toUpperCase()} /tarjetas rechaza ${caso} con 400 ${codigoEsperado}`, async () => {
          const existente = method === 'put' ? await crearTarjeta(ctx.a) : null;
          const ruta =
            method === 'put' ? `/tarjetas/${existente.id}` : '/tarjetas';
          const req = ctx.api[method](ruta).auth(ctx.a.token, {
            type: 'bearer',
          });
          const res = await (patch === undefined
            ? req
            : req.send(payloadTarjeta(patch)));
          expectError(res, 400, codigoEsperado);
        });
      }
    }

    it('POST/PUT de gastos y membresías aceptan tarjeta_id propia, rechazan tarjeta ajena/inválida y aplican ON DELETE SET NULL', async () => {
      const tarjetaA1 = await crearTarjeta(ctx.a, { nombre: 'Card A1' });
      const tarjetaA2 = await crearTarjeta(ctx.a, { nombre: 'Card A2' });
      const tarjetaB = await crearTarjeta(ctx.b, { nombre: 'Card B' });

      // Crear gasto con tarjetaA1
      const gasto = await ctx.crearGasto(ctx.a, {
        monto: 250,
        metodo_pago: 'tarjeta',
        tarjeta_id: tarjetaA1.id,
      });
      assert.equal(gasto.tarjeta_id, tarjetaA1.id);

      // Cambiar gasto a tarjetaA2
      const { body: gastoEdit } = await ctx.api
        .put(`/gastos/${gasto.id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .send(
          ctx.gasto({
            monto: 300,
            metodo_pago: 'tarjeta',
            tarjeta_id: tarjetaA2.id,
          })
        )
        .expect(200);
      assert.equal(gastoEdit.gasto.tarjeta_id, tarjetaA2.id);

      // Crear membresía con tarjetaA2
      const { body: memBody } = await ctx.api
        .post('/membresias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          nombre: 'Netflix',
          costo: 199,
          frecuencia: 'mensual',
          fecha_cobro: '2026-10-20',
          tarjeta_id: tarjetaA2.id,
        })
        .expect(201);
      assert.equal(memBody.membresia.tarjeta_id, tarjetaA2.id);

      // Rechazar tarjeta de otro usuario o inválida en gastos y membresías
      for (const badId of [tarjetaB.id, 999999, 0, -1, '1', true]) {
        expectError(
          await ctx.api
            .post('/gastos')
            .auth(ctx.a.token, { type: 'bearer' })
            .send(ctx.gasto({ tarjeta_id: badId })),
          400,
          'TARJETA_INVALIDA'
        );
        expectError(
          await ctx.api
            .put(`/gastos/${gasto.id}`)
            .auth(ctx.a.token, { type: 'bearer' })
            .send(ctx.gasto({ tarjeta_id: badId })),
          400,
          'TARJETA_INVALIDA'
        );
        expectError(
          await ctx.api
            .post('/membresias')
            .auth(ctx.a.token, { type: 'bearer' })
            .send({
              nombre: 'Spotify',
              costo: 129,
              frecuencia: 'mensual',
              fecha_cobro: '2026-10-20',
              tarjeta_id: badId,
            }),
          400,
          'TARJETA_INVALIDA'
        );
        expectError(
          await ctx.api
            .put(`/membresias/${memBody.membresia.id}`)
            .auth(ctx.a.token, { type: 'bearer' })
            .send({
              nombre: 'Netflix',
              costo: 199,
              frecuencia: 'mensual',
              fecha_cobro: '2026-10-20',
              tarjeta_id: badId,
            }),
          400,
          'TARJETA_INVALIDA'
        );
      }

      // Al eliminar tarjetaA2, el gasto y la membresía conservan sus registros con tarjeta_id = null
      await ctx.api
        .delete(`/tarjetas/${tarjetaA2.id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      const gastosLista = await ctx.listar(ctx.a);
      assert.equal(gastosLista.length, 1);
      assert.equal(gastosLista[0].id, gasto.id);
      assert.equal(gastosLista[0].tarjeta_id, null);

      const { body: memLista } = await ctx.api
        .get('/membresias')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.equal(memLista.length, 1);
      assert.equal(memLista[0].id, memBody.membresia.id);
      assert.equal(memLista[0].tarjeta_id, null);
    });

    it('GET /tarjetas/:id/resumen?mes=YYYY-MM calcula total gastado del mes (gastos + membresías activas)', async () => {
      const tarjeta = await crearTarjeta(ctx.a);
      const otraTarjeta = await crearTarjeta(ctx.a, {
        nombre: 'Otra',
        ultimos4: '5555',
      });

      // Resumen vacío inicialmente
      const { body: vacio } = await ctx.api
        .get(`/tarjetas/${tarjeta.id}/resumen?mes=2026-10`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.deepEqual(vacio, {
        tarjeta_id: tarjeta.id,
        mes: '2026-10',
        gasto_variable: 0,
        gasto_fijo: 0,
        total: 0,
      });

      // Dos gastos en 2026-10 con la tarjeta (150 + 49.50 = 199.50), uno en otro mes y uno con otra tarjeta
      await ctx.crearGasto(ctx.a, {
        monto: 150,
        fecha: '2026-10-05',
        tarjeta_id: tarjeta.id,
      });
      await ctx.crearGasto(ctx.a, {
        monto: 49.5,
        fecha: '2026-10-18',
        tarjeta_id: tarjeta.id,
      });
      await ctx.crearGasto(ctx.a, {
        monto: 999,
        fecha: '2026-11-01',
        tarjeta_id: tarjeta.id,
      });
      await ctx.crearGasto(ctx.a, {
        monto: 500,
        fecha: '2026-10-10',
        tarjeta_id: otraTarjeta.id,
      });

      // Membresía mensual activa (199), anual activa (1200/12 = 100) y una pausada (300, no suma)
      await ctx.api
        .post('/membresias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          nombre: 'Netflix',
          costo: 199,
          frecuencia: 'mensual',
          fecha_cobro: '2026-10-20',
          tarjeta_id: tarjeta.id,
        })
        .expect(201);
      await ctx.api
        .post('/membresias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          nombre: 'Amazon Prime Anual',
          costo: 1200,
          frecuencia: 'anual',
          fecha_cobro: '2026-10-20',
          tarjeta_id: tarjeta.id,
        })
        .expect(201);
      await ctx.api
        .post('/membresias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          nombre: 'Pausada',
          costo: 300,
          frecuencia: 'mensual',
          fecha_cobro: '2026-10-20',
          estado: 'pausada',
          tarjeta_id: tarjeta.id,
        })
        .expect(201);

      const { body: resumen } = await ctx.api
        .get(`/tarjetas/${tarjeta.id}/resumen?mes=2026-10`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.deepEqual(resumen, {
        tarjeta_id: tarjeta.id,
        mes: '2026-10',
        gasto_variable: 199.5,
        gasto_fijo: 299,
        total: 498.5,
      });

      // Validación de mes inválido
      for (const mesMal of ['', '2026-13', '2026-1', 'invalido']) {
        expectError(
          await ctx.api
            .get(`/tarjetas/${tarjeta.id}/resumen`)
            .query({ mes: mesMal })
            .auth(ctx.a.token, { type: 'bearer' }),
          400,
          'MES_INVALIDO'
        );
      }
      expectError(
        await ctx.api
          .get(`/tarjetas/${tarjeta.id}/resumen`)
          .auth(ctx.a.token, { type: 'bearer' }),
        400,
        'MES_INVALIDO'
      );
    });

    it('DELETE /auth/cuenta (HU-68) borra también las tarjetas del usuario sin tocar las de otros', async () => {
      const tA = await crearTarjeta(ctx.a);
      const tB = await crearTarjeta(ctx.b);

      await ctx.api
        .delete('/auth/cuenta')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ password: ctx.password })
        .expect(200);

      const { rows: rowsA } = await ctx.pool.query(
        'SELECT id FROM tarjetas WHERE id = $1',
        [tA.id]
      );
      assert.equal(rowsA.length, 0);

      const { rows: rowsB } = await ctx.pool.query(
        'SELECT id FROM tarjetas WHERE id = $1',
        [tB.id]
      );
      assert.equal(rowsB.length, 1);
    });

    for (const [method, route, body] of [
      ['get', '/tarjetas'],
      ['post', '/tarjetas', payloadTarjeta()],
      ['put', '/tarjetas/1', payloadTarjeta()],
      ['delete', '/tarjetas/1'],
      ['get', '/tarjetas/1/resumen?mes=2026-10'],
    ]) {
      for (const token of [null, 'token-invalido']) {
        it(`Autenticación ${method.toUpperCase()} ${route} (${token ? 'token inválido' : 'sin token'}) responde 401`, async () => {
          const req = ctx.api[method](route);
          if (token) req.auth(token, { type: 'bearer' });
          if (body) req.send(body);
          expectError(await req, 401, 'NO_AUTORIZADO');
        });
      }
    }
  });
