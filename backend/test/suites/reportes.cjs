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

    describe('GET /reportes/ingresos y GET /reportes/balance', () => {
      const crearIngreso = async (user, datos) => {
        const { body } = await ctx.api
          .post('/ingresos')
          .auth(user.token, { type: 'bearer' })
          .send({
            monto: 1000,
            fecha: '2026-10-15',
            descripcion: 'Ingreso QA',
            fuente: 'Salario',
            ...datos,
          })
          .expect(201);
        return body.ingreso;
      };

      it('mes sin datos devuelve ceros y arreglos válidos en /reportes/ingresos y /reportes/balance (no error)', async () => {
        const { body: repIngresos } = await ctx.api
          .get('/reportes/ingresos?mes=2026-10')
          .auth(ctx.a.token, { type: 'bearer' })
          .expect(200);

        assert.deepEqual(repIngresos, {
          mes: '2026-10',
          total: 0,
          por_fuente: [],
          mes_anterior: '2026-09',
          total_mes_anterior: 0,
          variacion: 0,
          variacion_porcentaje: 0,
        });

        const { body: repBalance } = await ctx.api
          .get('/reportes/balance?mes=2026-10')
          .auth(ctx.a.token, { type: 'bearer' })
          .expect(200);

        assert.deepEqual(repBalance, {
          mes: '2026-10',
          ingresos: 0,
          gasto_variable: 0,
          gasto_fijo: 0,
          gastos: 0,
          balance: 0,
          serie: [
            { mes: '2026-05', ingresos: 0, gasto_variable: 0, gasto_fijo: 0, gastos: 0, balance: 0 },
            { mes: '2026-06', ingresos: 0, gasto_variable: 0, gasto_fijo: 0, gastos: 0, balance: 0 },
            { mes: '2026-07', ingresos: 0, gasto_variable: 0, gasto_fijo: 0, gastos: 0, balance: 0 },
            { mes: '2026-08', ingresos: 0, gasto_variable: 0, gasto_fijo: 0, gastos: 0, balance: 0 },
            { mes: '2026-09', ingresos: 0, gasto_variable: 0, gasto_fijo: 0, gastos: 0, balance: 0 },
            { mes: '2026-10', ingresos: 0, gasto_variable: 0, gasto_fijo: 0, gastos: 0, balance: 0 },
          ],
        });
      });

      it('GET /reportes/ingresos coincide con /ingresos, desglosa por fuente con porcentajes y calcula variación frente al mes anterior', async () => {
        // Mes anterior (2026-09): 10,000
        await crearIngreso(ctx.a, {
          monto: 10000,
          fecha: '2026-09-30',
          fuente: 'Salario',
        });

        // Mes consultado (2026-10): Salario (8000 + 4000 = 12000), Freelance (2000), sin fuente (1000) -> total = 15,000
        await crearIngreso(ctx.a, {
          monto: 8000,
          fecha: '2026-10-01',
          fuente: 'Salario',
        });
        await crearIngreso(ctx.a, {
          monto: 4000,
          fecha: '2026-10-15',
          fuente: 'Salario',
        });
        await crearIngreso(ctx.a, {
          monto: 2000,
          fecha: '2026-10-20',
          fuente: 'Freelance',
        });
        await crearIngreso(ctx.a, {
          monto: 1000,
          fecha: '2026-10-25',
          fuente: null,
        });

        // Ingreso de otro mes (2026-11) y de otro usuario (B) no deben contaminar
        await crearIngreso(ctx.a, {
          monto: 9999,
          fecha: '2026-11-01',
          fuente: 'Bono',
        });
        await crearIngreso(ctx.b, {
          monto: 50000,
          fecha: '2026-10-10',
          fuente: 'Salario',
        });

        const { body: listaIngresos } = await ctx.api
          .get('/ingresos?mes=2026-10')
          .auth(ctx.a.token, { type: 'bearer' })
          .expect(200);
        const sumaIngresosEndpoint = listaIngresos.reduce(
          (acc, i) => acc + i.monto,
          0
        );

        const { body: rep } = await ctx.api
          .get('/reportes/ingresos?mes=2026-10')
          .auth(ctx.a.token, { type: 'bearer' })
          .expect(200);

        assert.equal(rep.total, sumaIngresosEndpoint);
        assert.deepEqual(rep, {
          mes: '2026-10',
          total: 15000,
          por_fuente: [
            { fuente: 'Salario', total: 12000, porcentaje: 80 },
            { fuente: 'Freelance', total: 2000, porcentaje: 13 },
            { fuente: 'Sin fuente', total: 1000, porcentaje: 7 },
          ],
          mes_anterior: '2026-09',
          total_mes_anterior: 10000,
          variacion: 5000,
          variacion_porcentaje: 50,
        });
        assert.equal(
          rep.por_fuente.reduce((acc, f) => acc + f.porcentaje, 0),
          100
        );
      });

      for (const cantidad of [18, 150]) {
        it(`GET /reportes/ingresos reparte 100% entre ${cantidad} fuentes iguales sin porcentajes negativos`, async () => {
          await ctx.pool.query(
            `INSERT INTO ingresos (usuario_id, monto, fecha, fuente)
             SELECT $1, 100, DATE '2026-10-15', 'Fuente ' || LPAD(numero::text, 3, '0')
             FROM generate_series(1, $2::integer) AS numero`,
            [ctx.a.usuario.id, cantidad]
          );

          const { body } = await ctx.api
            .get('/reportes/ingresos?mes=2026-10')
            .auth(ctx.a.token, { type: 'bearer' })
            .expect(200);

          assert.equal(body.total, cantidad * 100);
          assert.equal(body.por_fuente.length, cantidad);
          const porcentajes = body.por_fuente.map((item) => item.porcentaje);
          assert.ok(porcentajes.every((valor) => Number.isInteger(valor) && valor >= 0 && valor <= 100));
          assert.equal(porcentajes.reduce((suma, valor) => suma + valor, 0), 100);
          assert.ok(Math.max(...porcentajes) - Math.min(...porcentajes) <= 1);
          // En empates se conserva el orden del reporte (total descendente, fuente ascendente).
          assert.equal(body.por_fuente[0].fuente, 'Fuente 001');
          assert.equal(porcentajes[0], Math.ceil(100 / cantidad));
          assert.equal(porcentajes[cantidad - 1], Math.floor(100 / cantidad));
        });
      }

      it('GET /reportes/ingresos asigna el punto restante al mayor residuo y conserva el orden de las fuentes', async () => {
        for (const [fuente, monto] of [['Salario', 343], ['Freelance', 334], ['Ventas', 323]]) {
          await crearIngreso(ctx.a, { monto, fuente });
        }

        const { body } = await ctx.api
          .get('/reportes/ingresos?mes=2026-10')
          .auth(ctx.a.token, { type: 'bearer' })
          .expect(200);

        assert.deepEqual(body.por_fuente, [
          { fuente: 'Salario', total: 343, porcentaje: 34 },
          { fuente: 'Freelance', total: 334, porcentaje: 34 },
          { fuente: 'Ventas', total: 323, porcentaje: 32 },
        ]);
      });

      it('GET /reportes/balance concilia exactamente con /ingresos y /reportes/resumen, excluye suscripciones pausadas y arma la serie de 6 meses', async () => {
        // Ingresos en distintos meses de la ventana de 6 meses (2025-09 a 2026-02, cruzando año)
        await crearIngreso(ctx.a, { monto: 5000, fecha: '2025-12-15', fuente: 'Aguinaldo' });
        await crearIngreso(ctx.a, { monto: 12000, fecha: '2026-01-15', fuente: 'Salario' });
        await crearIngreso(ctx.a, { monto: 15000, fecha: '2026-02-10', fuente: 'Salario' });

        // Gastos variables en distintos meses
        await ctx.crearGasto(ctx.a, { monto: 1000, fecha: '2025-12-20' });
        await ctx.crearGasto(ctx.a, { monto: 2500, fecha: '2026-01-10' });
        await ctx.crearGasto(ctx.a, { monto: 3200.5, fecha: '2026-02-05' });

        // Membresías de A: una mensual activa (200), una anual activa (1200 -> 100/mes) y una pausada (499 -> no cuenta, fix #87)
        await ctx.pool.query(
          `INSERT INTO membresias (usuario_id, nombre, costo, frecuencia, fecha_cobro, estado)
           VALUES
             ($1, 'Spotify', 200, 'mensual', '2026-02-15', 'activa'),
             ($1, 'Prime Anual', 1200, 'anual', '2026-02-20', 'activa'),
             ($1, 'Gym Pausado', 499, 'mensual', '2026-02-10', 'pausada')`,
          [ctx.a.usuario.id]
        );

        // Datos de Usuario B que no deben mezclarse
        await crearIngreso(ctx.b, { monto: 99999, fecha: '2026-02-10' });
        await ctx.crearGasto(ctx.b, { monto: 8888, fecha: '2026-02-10' });

        const { body: resumenFeb } = await ctx.api
          .get('/reportes/resumen?mes=2026-02')
          .auth(ctx.a.token, { type: 'bearer' })
          .expect(200);
        const { body: ingresosFeb } = await ctx.api
          .get('/reportes/ingresos?mes=2026-02')
          .auth(ctx.a.token, { type: 'bearer' })
          .expect(200);
        const { body: balanceFeb } = await ctx.api
          .get('/reportes/balance?mes=2026-02')
          .auth(ctx.a.token, { type: 'bearer' })
          .expect(200);

        // Los números coinciden con /reportes/ingresos y /reportes/resumen del mismo mes
        assert.equal(balanceFeb.ingresos, ingresosFeb.total);
        assert.equal(balanceFeb.gasto_variable, resumenFeb.gasto_variable);
        assert.equal(balanceFeb.gasto_fijo, resumenFeb.gasto_fijo);
        assert.equal(balanceFeb.gastos, resumenFeb.total);
        assert.equal(balanceFeb.gasto_fijo, 300); // 200 + 100 (la pausada de 499 no suma)
        assert.equal(
          balanceFeb.balance,
          15000 - 3200.5 - 300
        );

        assert.deepEqual(balanceFeb, {
          mes: '2026-02',
          ingresos: 15000,
          gasto_variable: 3200.5,
          gasto_fijo: 300,
          gastos: 3500.5,
          balance: 11499.5,
          serie: [
            { mes: '2025-09', ingresos: 0, gasto_variable: 0, gasto_fijo: 300, gastos: 300, balance: -300 },
            { mes: '2025-10', ingresos: 0, gasto_variable: 0, gasto_fijo: 300, gastos: 300, balance: -300 },
            { mes: '2025-11', ingresos: 0, gasto_variable: 0, gasto_fijo: 300, gastos: 300, balance: -300 },
            { mes: '2025-12', ingresos: 5000, gasto_variable: 1000, gasto_fijo: 300, gastos: 1300, balance: 3700 },
            { mes: '2026-01', ingresos: 12000, gasto_variable: 2500, gasto_fijo: 300, gastos: 2800, balance: 9200 },
            { mes: '2026-02', ingresos: 15000, gasto_variable: 3200.5, gasto_fijo: 300, gastos: 3500.5, balance: 11499.5 },
          ],
        });
      });

      for (const ruta of ['/reportes/ingresos', '/reportes/balance']) {
        it(`${ruta} valida mes obligatorio e inválido con 400 MES_INVALIDO y token con 401 NO_AUTORIZADO`, async () => {
          expectError(
            await ctx.api.get(ruta).auth(ctx.a.token, { type: 'bearer' }),
            400,
            'MES_INVALIDO'
          );

          for (const mesMal of ['', '2026', '2026-1', '2026-13', '2026-00', 'invalido']) {
            expectError(
              await ctx.api
                .get(`${ruta}?mes=${encodeURIComponent(mesMal)}`)
                .auth(ctx.a.token, { type: 'bearer' }),
              400,
              'MES_INVALIDO'
            );
          }

          expectError(await ctx.api.get(`${ruta}?mes=2026-10`), 401, 'NO_AUTORIZADO');
          expectError(
            await ctx.api
              .get(`${ruta}?mes=2026-10`)
              .auth('token-invalido', { type: 'bearer' }),
            401,
            'NO_AUTORIZADO'
          );
        });
      }
    });
  });

