const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { expectError } = require('../helpers/fixtures.cjs');

module.exports = (getContext) =>
  describe('Ingresos (HU-82 / Migración 015)', () => {
    let ctx;
    beforeEach(async () => {
      ctx = getContext();
      await ctx.reset();
    });

    const call = (method, route, body, user = ctx.a) =>
      ctx.api[method](route).auth(user.token, { type: 'bearer' }).send(body);

    const baseIngreso = (overrides = {}) => ({
      monto: 15000,
      fecha: '2026-11-01',
      descripcion: 'Quincena noviembre',
      fuente: 'Salario',
      ...overrides,
    });

    async function crear(overrides = {}, user = ctx.a) {
      const res = await call(
        'post',
        '/ingresos',
        baseIngreso(overrides),
        user
      ).expect(201);
      return res.body.ingreso;
    }

    async function listar(mes, user = ctx.a) {
      const ruta = mes === undefined ? '/ingresos' : `/ingresos?mes=${mes}`;
      const res = await call('get', ruta, undefined, user).expect(200);
      return res.body;
    }

    it('Migración 015: crea la tabla ingresos con ON DELETE CASCADE y es idempotente en base existente', async () => {
      const { rows: cols } = await ctx.pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ingresos'
        ORDER BY column_name
      `);
      assert.deepEqual(
        cols.map((c) => c.column_name),
        [
          'created_at',
          'descripcion',
          'fecha',
          'fuente',
          'id',
          'monto',
          'usuario_id',
        ]
      );

      const { rows: fk } = await ctx.pool.query(`
        SELECT rc.delete_rule
        FROM information_schema.referential_constraints rc
        INNER JOIN information_schema.table_constraints tc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'ingresos'
          AND tc.constraint_type = 'FOREIGN KEY'
      `);
      assert.equal(fk[0]?.delete_rule, 'CASCADE');

      // Crear un ingreso y reaplicar el script SQL sobre una base existente no falla ni borra datos
      const creado = await crear();
      const sql = fs.readFileSync(
        path.resolve(__dirname, '../../migrations/015_ingresos.sql'),
        'utf8'
      );
      await ctx.pool.query(sql);

      const actuales = await listar('2026-11');
      assert.equal(actuales.length, 1);
      assert.equal(actuales[0].id, creado.id);
    });

    it('CRUD completo: crea, lista por mes en orden descendente, edita y elimina ingresos', async () => {
      const oct = await crear({
        monto: 12000,
        fecha: '2026-10-15',
        descripcion: 'Quincena octubre',
        fuente: 'Salario',
      });
      const nov1 = await crear({
        monto: 3500.5,
        fecha: '2026-11-05',
        descripcion: 'Proyecto web',
        fuente: 'Freelance',
      });
      const nov2 = await crear({
        monto: 15000,
        fecha: '2026-11-15',
        descripcion: null,
        fuente: null,
      });

      assert.deepEqual(nov1, {
        id: nov1.id,
        monto: 3500.5,
        fecha: '2026-11-05',
        descripcion: 'Proyecto web',
        fuente: 'Freelance',
      });
      assert.deepEqual(nov2, {
        id: nov2.id,
        monto: 15000,
        fecha: '2026-11-15',
        descripcion: null,
        fuente: null,
      });

      const listaNov = await listar('2026-11');
      assert.deepEqual(
        listaNov.map((i) => i.id),
        [nov2.id, nov1.id]
      );

      const listaOct = await listar('2026-10');
      assert.deepEqual(
        listaOct.map((i) => i.id),
        [oct.id]
      );

      const editado = await call('put', `/ingresos/${nov1.id}`, {
        monto: 4200.75,
        fecha: '2026-11-20',
        descripcion: 'Proyecto web + bono',
        fuente: 'Freelance',
      }).expect(200);

      assert.deepEqual(editado.body.ingreso, {
        id: nov1.id,
        monto: 4200.75,
        fecha: '2026-11-20',
        descripcion: 'Proyecto web + bono',
        fuente: 'Freelance',
      });

      const borrado = await call('delete', `/ingresos/${nov1.id}`).expect(200);
      assert.deepEqual(borrado.body, { eliminado: true });

      expectError(
        await call('delete', `/ingresos/${nov1.id}`),
        404,
        'INGRESO_NO_ENCONTRADO'
      );
      assert.deepEqual(
        (await listar('2026-11')).map((i) => i.id),
        [nov2.id]
      );
    });

    for (const [nombre, patch, codigo] of [
      ['monto 0', { monto: 0 }, 'MONTO_INVALIDO'],
      ['monto negativo', { monto: -500 }, 'MONTO_INVALIDO'],
      ['monto texto', { monto: '1500' }, 'MONTO_INVALIDO'],
      ['monto con 3 decimales', { monto: 100.123 }, 'MONTO_INVALIDO'],
      ['monto excesivo', { monto: 10000000000 }, 'MONTO_INVALIDO'],
      ['fecha vacía', { fecha: '' }, 'FECHA_INVALIDA'],
      ['fecha inexistente 2026-02-30', { fecha: '2026-02-30' }, 'FECHA_INVALIDA'],
      ['fecha mes 13', { fecha: '2026-13-01' }, 'FECHA_INVALIDA'],
      ['fecha formato DD-MM-YYYY', { fecha: '01-11-2026' }, 'FECHA_INVALIDA'],
      ['descripción no textual', { descripcion: 12345 }, 'DESCRIPCION_INVALIDA'],
      [
        'descripción mayor a 200 caracteres',
        { descripcion: 'x'.repeat(201) },
        'DESCRIPCION_INVALIDA',
      ],
      ['fuente no textual', { fuente: 12345 }, 'FUENTE_INVALIDA'],
      ['fuente solo espacios', { fuente: '   ' }, 'FUENTE_INVALIDA'],
      [
        'fuente mayor a 100 caracteres',
        { fuente: 'f'.repeat(101) },
        'FUENTE_INVALIDA',
      ],
    ]) {
      it(`Validación en POST y PUT /ingresos: rechaza ${nombre} con 400 ${codigo}`, async () => {
        const resPost = await call('post', '/ingresos', baseIngreso(patch));
        expectError(resPost, 400, codigo);
        assert.deepEqual(await listar(), []);

        const existente = await crear();
        const resPut = await call(
          'put',
          `/ingresos/${existente.id}`,
          baseIngreso(patch)
        );
        expectError(resPut, 400, codigo);
        assert.equal((await listar())[0].monto, existente.monto);
      });
    }

    for (const mes of ['', '2026-1', '2026-00', '2026-13', '2026-11-01']) {
      it(`GET /ingresos rechaza mes inválido ${JSON.stringify(mes)} con 400 MES_INVALIDO`, async () => {
        expectError(
          await call('get', `/ingresos?mes=${mes}`),
          400,
          'MES_INVALIDO'
        );
      });
    }

    it('Privacidad: otro usuario no ve ingresos ajenos y recibe 404 INGRESO_NO_ENCONTRADO en PUT y DELETE', async () => {
      const ingresoA = await crear({}, ctx.a);

      assert.deepEqual(await listar('2026-11', ctx.b), []);

      expectError(
        await call(
          'put',
          `/ingresos/${ingresoA.id}`,
          baseIngreso({ monto: 1 }),
          ctx.b
        ),
        404,
        'INGRESO_NO_ENCONTRADO'
      );
      expectError(
        await call('delete', `/ingresos/${ingresoA.id}`, undefined, ctx.b),
        404,
        'INGRESO_NO_ENCONTRADO'
      );

      for (const idInvalido of ['0', '-5', 'abc', '999999']) {
        expectError(
          await call(
            'put',
            `/ingresos/${idInvalido}`,
            baseIngreso(),
            ctx.a
          ),
          404,
          'INGRESO_NO_ENCONTRADO'
        );
        expectError(
          await call('delete', `/ingresos/${idInvalido}`, undefined, ctx.a),
          404,
          'INGRESO_NO_ENCONTRADO'
        );
      }

      const listaA = await listar('2026-11', ctx.a);
      assert.equal(listaA.length, 1);
      assert.equal(listaA[0].monto, 15000);
    });

    it('DELETE /auth/cuenta (HU-68) y borrado de usuario eliminan también los ingresos del usuario sin tocar los de otros', async () => {
      await crear({ monto: 18000 }, ctx.a);
      const ingresoB = await crear({ monto: 22000 }, ctx.b);

      const res = await call('delete', '/auth/cuenta', undefined, ctx.a).expect(
        200
      );
      assert.deepEqual(res.body, { eliminado: true });

      const { rows: ingresosA } = await ctx.pool.query(
        'SELECT id FROM ingresos WHERE usuario_id = $1',
        [ctx.a.usuario.id]
      );
      assert.deepEqual(ingresosA, []);

      const listaB = await listar('2026-11', ctx.b);
      assert.equal(listaB.length, 1);
      assert.equal(listaB[0].id, ingresoB.id);
    });

    it('Reportes y presupuestos no cambian: siguen sumando únicamente gastos', async () => {
      await call('post', '/presupuestos', {
        categoria_id: ctx.categoria,
        mes: '2026-11',
        monto_limite: 1000,
      }).expect(201);

      await ctx.crearGasto(ctx.a, {
        monto: 300,
        categoria_id: ctx.categoria,
        fecha: '2026-11-05',
      });

      await crear({
        monto: 25000,
        fecha: '2026-11-05',
        descripcion: 'Nómina',
        fuente: 'Salario',
      });

      const presupuestos = (
        await call('get', '/presupuestos?mes=2026-11').expect(200)
      ).body;
      assert.equal(presupuestos.length, 1);
      assert.equal(presupuestos[0].gastado, 300);
      assert.equal(presupuestos[0].porcentaje, 30);
      assert.equal(presupuestos[0].estado, 'ok');

      const resumen = (
        await call('get', '/reportes/resumen?mes=2026-11').expect(200)
      ).body;
      assert.equal(resumen.gasto_variable, 300);
      assert.equal(resumen.total, 300);

      const porCategoria = (
        await call('get', '/reportes/por-categoria?mes=2026-11').expect(200)
      ).body;
      assert.equal(porCategoria.length, 1);
      assert.equal(porCategoria[0].total, 300);
    });

    for (const [method, route, body] of [
      ['get', '/ingresos?mes=2026-11'],
      ['post', '/ingresos', { monto: 1000, fecha: '2026-11-01' }],
      ['put', '/ingresos/1', { monto: 1000, fecha: '2026-11-01' }],
      ['delete', '/ingresos/1'],
    ]) {
      for (const token of [undefined, 'invalido']) {
        it(`Autenticación ${method.toUpperCase()} /ingresos: ${token ? 'token inválido' : 'sin token'} responde 401`, async () => {
          let req = ctx.api[method](route);
          if (token) req = req.auth(token, { type: 'bearer' });
          expectError(await req.send(body), 401, 'NO_AUTORIZADO');
        });
      }
    }
  });
