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
          'frecuencia',
          'fuente',
          'id',
          'ingreso_origen_id',
          'monto',
          'proximo_ingreso',
          'recurrente',
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
        frecuencia: null,
        proximo_ingreso: null,
        recurrente: false,
      });
      assert.deepEqual(nov2, {
        id: nov2.id,
        monto: 15000,
        fecha: '2026-11-15',
        descripcion: null,
        fuente: null,
        frecuencia: null,
        proximo_ingreso: null,
        recurrente: false,
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
        frecuencia: null,
        proximo_ingreso: null,
        recurrente: false,
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

      const res = await call(
        'delete',
        '/auth/cuenta',
        { password: ctx.password },
        ctx.a
      ).expect(200);
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

    describe('Ingresos recurrentes (feature/ingresos-recurrentes / Migración 022)', () => {
      for (const [anio, febrero] of [[2026, '28'], [2028, '29']]) {
        it(`mensual conserva el día 31 después de febrero de ${anio}`, async () => {
          const { procesarIngresosRecurrentes } = require('../../src/jobs/ingresosRecurrentes');
          const base = await crear({ fecha: `${anio}-01-31`, frecuencia: 'mensual' });
          const resultado = await procesarIngresosRecurrentes({
            pool: ctx.pool, fechaReferencia: `${anio}-04-30`,
          });
          assert.equal(resultado.errores, 0);
          assert.equal(resultado.generados, 3);
          const { rows } = await ctx.pool.query(
            "SELECT TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha FROM ingresos WHERE ingreso_origen_id = $1 ORDER BY fecha",
            [base.id]
          );
          assert.deepEqual(rows.map(i => i.fecha), [
            `${anio}-02-${febrero}`, `${anio}-03-31`, `${anio}-04-30`,
          ]);
          const original = (await listar()).find(i => i.id === base.id);
          assert.equal(original.proximo_ingreso, `${anio}-05-31`);
        });
      }

      it('no genera si la API confirma la cancelación después de seleccionar los pendientes', async () => {
        const { procesarIngresosRecurrentes } = require('../../src/jobs/ingresosRecurrentes');
        const datos = baseIngreso({ frecuencia: 'quincenal' });
        const base = await crear(datos);
        let liberar;
        let avisar;
        const pausa = new Promise(resolve => { liberar = resolve; });
        const seleccionado = new Promise(resolve => { avisar = resolve; });
        const poolConPausa = {
          connect: () => ctx.pool.connect(),
          query: async (sql, valores) => {
            const resultado = await ctx.pool.query(sql, valores);
            if (sql.includes('ORDER BY id ASC')) {
              avisar();
              await pausa;
            }
            return resultado;
          },
        };
        const proceso = procesarIngresosRecurrentes({
          pool: poolConPausa, fechaReferencia: '2026-11-16',
        });
        try {
          await seleccionado;
          await call('put', `/ingresos/${base.id}`, { ...datos, frecuencia: null }).expect(200);
        } finally {
          liberar();
          await proceso;
        }
        const resultado = await proceso;
        assert.equal(resultado.errores, 0);
        assert.equal(resultado.generados, 0);
        const lista = await listar();
        assert.equal(lista.length, 1);
        assert.equal(lista[0].frecuencia, null);
        assert.equal(lista[0].proximo_ingreso, null);
      });

      it('dos jobs simultáneos generan una sola vez cada periodo pendiente', async () => {
        const { procesarIngresosRecurrentes } = require('../../src/jobs/ingresosRecurrentes');
        await crear({ frecuencia: 'semanal' });
        const resultados = await Promise.all([1, 2].map(() => procesarIngresosRecurrentes({
          pool: ctx.pool, fechaReferencia: '2026-11-22',
        })));
        assert.equal(resultados.reduce((total, r) => total + r.generados, 0), 3);
        assert.ok(resultados.every(r => r.errores === 0));
        const lista = await listar();
        assert.equal(lista.length, 4);
        assert.equal(lista.filter(i => i.recurrente).length, 3);
        assert.equal(lista.find(i => !i.recurrente).proximo_ingreso, '2026-11-29');
      });

      it('revierte los ingresos generados si falla el avance y permite reintentar', async () => {
        const { procesarIngresosRecurrentes } = require('../../src/jobs/ingresosRecurrentes');
        await crear({ frecuencia: 'semanal' });
        const errores = [];
        const poolConFallo = {
          query: (...args) => ctx.pool.query(...args),
          connect: async () => {
            const client = await ctx.pool.connect();
            return {
              release: () => client.release(),
              query: (sql, valores) => {
                if (sql.startsWith('UPDATE ingresos SET proximo_ingreso')) {
                  return Promise.reject(new Error('Fallo simulado al avanzar'));
                }
                return client.query(sql, valores);
              },
            };
          },
        };
        const fallido = await procesarIngresosRecurrentes({
          pool: poolConFallo, fechaReferencia: '2026-11-08',
          logger: { error: mensaje => errores.push(mensaje) },
        });
        assert.equal(fallido.errores, 1);
        assert.equal(fallido.generados, 0);
        assert.match(errores[0], /Fallo simulado/);
        const lista = await listar();
        assert.equal(lista.length, 1);
        assert.equal(lista[0].proximo_ingreso, '2026-11-08');
        const reintento = await procesarIngresosRecurrentes({
          pool: ctx.pool, fechaReferencia: '2026-11-08',
        });
        assert.equal(reintento.errores, 0);
        assert.equal(reintento.generados, 1);
        assert.equal((await listar()).length, 2);
      });

      it('Migración 022 es idempotente y POST/PUT /ingresos aceptan frecuencia (semanal, quincenal, mensual) y rechazan valores inválidos', async () => {
        const sql022 = fs.readFileSync(
          path.resolve(
            __dirname,
            '../../migrations/022_ingresos_recurrentes.sql'
          ),
          'utf8'
        );
        await ctx.pool.query(sql022);
        await ctx.pool.query(sql022);

        const semanal = await crear({
          fecha: '2026-11-01',
          frecuencia: 'semanal',
        });
        assert.equal(semanal.frecuencia, 'semanal');
        assert.equal(semanal.proximo_ingreso, '2026-11-08');
        assert.equal(semanal.recurrente, false);

        const quincenal = await crear({
          fecha: '2026-11-01',
          frecuencia: 'quincenal',
        });
        assert.equal(quincenal.frecuencia, 'quincenal');
        assert.equal(quincenal.proximo_ingreso, '2026-11-16');

        // Fin de mes en mensual (31 de enero -> 28 de febrero en 2026)
        const mensual = await crear({
          fecha: '2026-01-31',
          frecuencia: 'mensual',
        });
        assert.equal(mensual.frecuencia, 'mensual');
        assert.equal(mensual.proximo_ingreso, '2026-02-28');

        for (const frecInvalida of ['diaria', 'anual', '', 123, true]) {
          expectError(
            await call(
              'post',
              '/ingresos',
              baseIngreso({ frecuencia: frecInvalida })
            ),
            400,
            'FRECUENCIA_INVALIDA'
          );
          expectError(
            await call(
              'put',
              `/ingresos/${semanal.id}`,
              baseIngreso({ frecuencia: frecInvalida })
            ),
            400,
            'FRECUENCIA_INVALIDA'
          );
        }
      });

      it('proceso diario genera el ingreso con recurrente: true una sola vez por fecha aunque corra dos veces el mismo día', async () => {
        const {
          procesarIngresosRecurrentes,
        } = require('../../src/jobs/ingresosRecurrentes');

        const base = await crear({
          monto: 15000,
          fecha: '2026-11-01',
          descripcion: 'Quincena nómina',
          fuente: 'Salario',
          frecuencia: 'quincenal',
        });
        assert.equal(base.proximo_ingreso, '2026-11-16');

        // Antes de la fecha programada no genera nada
        const antes = await procesarIngresosRecurrentes({
          fechaReferencia: '2026-11-15',
          pool: ctx.pool,
        });
        assert.equal(antes.generados, 0);

        // El día 2026-11-16 genera exactamente 1 ingreso y avanza proximo_ingreso a 2026-12-01
        const primera = await procesarIngresosRecurrentes({
          fechaReferencia: '2026-11-16',
          pool: ctx.pool,
        });
        assert.equal(primera.revisados, 1);
        assert.equal(primera.generados, 1);
        assert.equal(primera.errores, 0);

        // Si el proceso corre una segunda vez el mismo día, no duplica
        const segunda = await procesarIngresosRecurrentes({
          fechaReferencia: '2026-11-16',
          pool: ctx.pool,
        });
        assert.equal(segunda.generados, 0);

        // Incluso forzando proximo_ingreso de nuevo a 2026-11-16, la restricción única impide duplicar esa fecha
        await ctx.pool.query(
          "UPDATE ingresos SET proximo_ingreso = '2026-11-16' WHERE id = $1",
          [base.id]
        );
        const forzada = await procesarIngresosRecurrentes({
          fechaReferencia: '2026-11-16',
          pool: ctx.pool,
        });
        assert.equal(forzada.generados, 0);
        assert.equal(forzada.omitidosPorDuplicado, 1);

        // GET /ingresos muestra el original (recurrente: false) y el generado (recurrente: true)
        const lista = await listar('2026-11');
        assert.equal(lista.length, 2);
        const generado = lista.find((i) => i.fecha === '2026-11-16');
        const original = lista.find((i) => i.fecha === '2026-11-01');
        assert.ok(generado);
        assert.equal(generado.recurrente, true);
        assert.equal(generado.frecuencia, null);
        assert.equal(generado.monto, 15000);
        assert.equal(original.recurrente, false);
        assert.equal(original.frecuencia, 'quincenal');
        assert.equal(original.proximo_ingreso, '2026-12-01');
      });

      it('cancelar la recurrencia detiene futuras generaciones pero NO borra los ingresos ya generados', async () => {
        const {
          procesarIngresosRecurrentes,
        } = require('../../src/jobs/ingresosRecurrentes');

        const base = await crear({
          monto: 8000,
          fecha: '2026-11-01',
          descripcion: 'Sueldo semanal',
          fuente: 'Salario',
          frecuencia: 'semanal',
        });

        // Generar el ingreso del 2026-11-08
        const gen = await procesarIngresosRecurrentes({
          fechaReferencia: '2026-11-08',
          pool: ctx.pool,
        });
        assert.equal(gen.generados, 1);

        // Cancelar la recurrencia con PUT /ingresos/:id enviando frecuencia: null
        const { body: cancelado } = await call('put', `/ingresos/${base.id}`, {
          monto: 8000,
          fecha: '2026-11-01',
          descripcion: 'Sueldo semanal',
          fuente: 'Salario',
          frecuencia: null,
        }).expect(200);
        assert.equal(cancelado.ingreso.frecuencia, null);
        assert.equal(cancelado.ingreso.proximo_ingreso, null);

        // En el siguiente periodo (2026-11-15) ya no genera otro ingreso
        const posterior = await procesarIngresosRecurrentes({
          fechaReferencia: '2026-11-15',
          pool: ctx.pool,
        });
        assert.equal(posterior.generados, 0);

        // El ingreso generado el 2026-11-08 se conserva intacto con recurrente: true
        const lista = await listar('2026-11');
        assert.equal(lista.length, 2);
        const generado = lista.find((i) => i.fecha === '2026-11-08');
        assert.ok(generado);
        assert.equal(generado.recurrente, true);
        assert.equal(generado.monto, 8000);
      });
    });
  });
