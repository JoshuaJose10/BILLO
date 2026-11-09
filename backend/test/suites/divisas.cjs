const http = require('node:http');
const { once } = require('node:events');
const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { expectError } = require('../helpers/fixtures.cjs');
const {
  limpiarCacheTipoCambio,
} = require('../../src/controllers/tipoCambio.controller');

module.exports = (getContext) =>
  describe('Cambio de moneda y divisas (RF11)', () => {
    let ctx;
    let mockServer;
    let urlBaseFuente;
    let llamadasFuente = 0;
    let modoFuente = 'ok';
    const urlAnterior = process.env.TIPO_CAMBIO_URL;

    before(async () => {
      mockServer = http.createServer((req, res) => {
        llamadasFuente++;
        const url = new URL(req.url, 'http://127.0.0.1');
        const base = url.searchParams.get('base');
        const symbols = url.searchParams.get('symbols');

        if (modoFuente === 'error500') {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Internal Error' }));
          return;
        }

        if (modoFuente === 'jsonInvalido') {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('no-es-json');
          return;
        }

        if (modoFuente === 'sinTasa') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ base, date: '2026-10-28', rates: {} }));
          return;
        }

        if (modoFuente === 'corteConexion') {
          req.socket.destroy();
          return;
        }

        const tasas = {
          USD: 18.6311,
          EUR: 20.123456,
          CAD: 13.45,
        };

        if (symbols !== 'MXN' || !tasas[base]) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            amount: 1,
            base,
            date: '2026-10-28',
            rates: { MXN: tasas[base] },
          })
        );
      });

      mockServer.listen(0, '127.0.0.1');
      await once(mockServer, 'listening');
      urlBaseFuente = `http://127.0.0.1:${mockServer.address().port}/v1/latest`;
    });

    beforeEach(async () => {
      ctx = getContext();
      await ctx.reset();
      limpiarCacheTipoCambio();
      llamadasFuente = 0;
      modoFuente = 'ok';
      process.env.TIPO_CAMBIO_URL = urlBaseFuente;
    });

    after(async () => {
      limpiarCacheTipoCambio();
      if (urlAnterior === undefined) {
        delete process.env.TIPO_CAMBIO_URL;
      } else {
        process.env.TIPO_CAMBIO_URL = urlAnterior;
      }
      if (mockServer) {
        await new Promise((resolve, reject) =>
          mockServer.close((err) => (err ? reject(err) : resolve()))
        );
      }
    });

    it('la ruta experimental antigua GET /tipo-cambio ya no existe y devuelve 404 RUTA_NO_ENCONTRADA', async () => {
      const res = await ctx.api
        .get('/tipo-cambio?moneda=USD')
        .auth(ctx.a.token, { type: 'bearer' });
      expectError(res, 404, 'RUTA_NO_ENCONTRADA');
    });

    it('GET /divisas/tipo-cambio devuelve tasa válida y usa caché en consultas subsecuentes', async () => {
      const res1 = await ctx.api
        .get('/divisas/tipo-cambio?moneda=USD')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.deepEqual(res1.body, {
        moneda: 'USD',
        tipo_cambio: 18.6311,
        fecha: '2026-10-28',
      });
      assert.equal(llamadasFuente, 1);

      // Si la fuente cae pero el valor está en caché, sigue respondiendo desde caché
      modoFuente = 'error500';
      const res2 = await ctx.api
        .get('/divisas/tipo-cambio?moneda=USD')
        .auth(ctx.b.token, { type: 'bearer' })
        .expect(200);

      assert.deepEqual(res2.body, res1.body);
      assert.equal(llamadasFuente, 1);
    });

    for (const [nombre, query] of [
      ['sin parámetro moneda', ''],
      ['moneda vacía', '?moneda='],
      ['moneda MXN (igual a base)', '?moneda=MXN'],
      ['código de 2 letras', '?moneda=US'],
      ['código de 4 letras', '?moneda=USDA'],
      ['código de 3 letras desconocido', '?moneda=XYZ'],
      ['código en minúsculas', '?moneda=usd'],
      ['código numérico', '?moneda=123'],
    ]) {
      it(`GET /divisas/tipo-cambio rechaza ${nombre} con 400 MONEDA_INVALIDA`, async () => {
        const res = await ctx.api
          .get(`/divisas/tipo-cambio${query}`)
          .auth(ctx.a.token, { type: 'bearer' });

        expectError(res, 400, 'MONEDA_INVALIDA');
        assert.equal(llamadasFuente, 0);
      });
    }

    for (const [nombre, modo] of [
      ['HTTP 500 de la fuente', 'error500'],
      ['JSON inválido de la fuente', 'jsonInvalido'],
      ['respuesta sin tasa numérica', 'sinTasa'],
      ['corte de conexión de red', 'corteConexion'],
    ]) {
      it(`GET /divisas/tipo-cambio responde 502 FUENTE_NO_DISPONIBLE ante ${nombre}`, async () => {
        modoFuente = modo;
        const res = await ctx.api
          .get('/divisas/tipo-cambio?moneda=EUR')
          .auth(ctx.a.token, { type: 'bearer' });

        expectError(res, 502, 'FUENTE_NO_DISPONIBLE');
      });
    }

    for (const modo of ['ausente', 'inválido', 'vencido', 'firma ajena', 'sin Bearer']) {
      it(`GET /divisas/tipo-cambio con token ${modo} devuelve 401 NO_AUTORIZADO`, async () => {
        const req = ctx.api.get('/divisas/tipo-cambio?moneda=USD');
        if (modo === 'inválido') req.auth('no-es-jwt', { type: 'bearer' });
        if (modo === 'vencido') {
          req.auth(
            jwt.sign({ id: ctx.a.usuario.id }, process.env.JWT_SECRET, {
              expiresIn: -1,
            }),
            { type: 'bearer' }
          );
        }
        if (modo === 'firma ajena') {
          req.auth(jwt.sign({ id: ctx.a.usuario.id }, 'otra-clave'), {
            type: 'bearer',
          });
        }
        if (modo === 'sin Bearer') req.set('Authorization', ctx.a.token);

        expectError(await req, 401, 'NO_AUTORIZADO');
        assert.equal(llamadasFuente, 0);
      });
    }

    it('POST/GET/PUT /gastos guardan y actualizan moneda, monto_original y tipo_cambio', async () => {
      const gastoUsd = await ctx.crearGasto(ctx.a, {
        monto: 186.31,
        moneda: 'USD',
        monto_original: 10,
        tipo_cambio: 18.6311,
        nota: 'Compra en dólares',
      });

      assert.deepEqual(gastoUsd, {
        id: gastoUsd.id,
        monto: 186.31,
        moneda: 'USD',
        monto_original: 10,
        tipo_cambio: 18.6311,
        categoria_id: ctx.categoria,
        fecha: '2026-10-05',
        metodo_pago: 'efectivo',
        nota: 'Compra en dólares',
      });

      const listados = await ctx.listar(ctx.a);
      assert.deepEqual(listados, [gastoUsd]);

      // Actualizar a EUR con 6 decimales de tipo de cambio (25 * 20.123456 = 503.0864 -> 503.09)
      const { body: actualizadoEur } = await ctx.api
        .put(`/gastos/${gastoUsd.id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .send(
          ctx.gasto({
            monto: 503.09,
            moneda: 'EUR',
            monto_original: 25,
            tipo_cambio: 20.123456,
            nota: 'Compra en euros',
          })
        )
        .expect(200);

      assert.deepEqual(actualizadoEur.gasto, {
        id: gastoUsd.id,
        monto: 503.09,
        moneda: 'EUR',
        monto_original: 25,
        tipo_cambio: 20.123456,
        categoria_id: ctx.categoria,
        fecha: '2026-10-05',
        metodo_pago: 'efectivo',
        nota: 'Compra en euros',
      });

      // Actualizar de vuelta a MXN omitiendo moneda limpia monto_original y tipo_cambio a null
      const { body: actualizadoMxn } = await ctx.api
        .put(`/gastos/${gastoUsd.id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .send(ctx.gasto({ monto: 100, nota: 'En pesos' }))
        .expect(200);

      assert.deepEqual(actualizadoMxn.gasto, {
        id: gastoUsd.id,
        monto: 100,
        moneda: 'MXN',
        monto_original: null,
        tipo_cambio: null,
        categoria_id: ctx.categoria,
        fecha: '2026-10-05',
        metodo_pago: 'efectivo',
        nota: 'En pesos',
      });
    });

    for (const method of ['post', 'put']) {
      for (const [nombre, patch, codigo] of [
        [
          'moneda desconocida de 3 letras',
          {
            monto: 186.31,
            moneda: 'XYZ',
            monto_original: 10,
            tipo_cambio: 18.6311,
          },
          'MONEDA_INVALIDA',
        ],
        [
          'moneda de 2 letras',
          {
            monto: 186.31,
            moneda: 'US',
            monto_original: 10,
            tipo_cambio: 18.6311,
          },
          'MONEDA_INVALIDA',
        ],
        [
          'moneda en minúsculas',
          {
            monto: 186.31,
            moneda: 'usd',
            monto_original: 10,
            tipo_cambio: 18.6311,
          },
          'MONEDA_INVALIDA',
        ],
        [
          'moneda no textual',
          {
            monto: 186.31,
            moneda: 123,
            monto_original: 10,
            tipo_cambio: 18.6311,
          },
          'MONEDA_INVALIDA',
        ],
        [
          'moneda extranjera sin monto_original ni tipo_cambio',
          { monto: 186.31, moneda: 'USD' },
          'MONTO_INVALIDO',
        ],
        [
          'moneda extranjera sin tipo_cambio',
          { monto: 186.31, moneda: 'USD', monto_original: 10 },
          'MONTO_INVALIDO',
        ],
        [
          'moneda extranjera sin monto_original',
          { monto: 186.31, moneda: 'USD', tipo_cambio: 18.6311 },
          'MONTO_INVALIDO',
        ],
        [
          'monto_original × tipo_cambio no coincide con monto',
          {
            monto: 200,
            moneda: 'USD',
            monto_original: 10,
            tipo_cambio: 18.6311,
          },
          'MONTO_INVALIDO',
        ],
        [
          'desfase de un centavo en la conversión',
          {
            monto: 186.32,
            moneda: 'USD',
            monto_original: 10,
            tipo_cambio: 18.6311,
          },
          'MONTO_INVALIDO',
        ],
        [
          'monto_original negativo',
          {
            monto: 186.31,
            moneda: 'USD',
            monto_original: -10,
            tipo_cambio: 18.6311,
          },
          'MONTO_INVALIDO',
        ],
        [
          'monto_original con más de 2 decimales',
          {
            monto: 18.63,
            moneda: 'USD',
            monto_original: 1.001,
            tipo_cambio: 18.611389,
          },
          'MONTO_INVALIDO',
        ],
        [
          'tipo_cambio cero',
          {
            monto: 186.31,
            moneda: 'USD',
            monto_original: 10,
            tipo_cambio: 0,
          },
          'MONTO_INVALIDO',
        ],
        [
          'tipo_cambio con más de 6 decimales',
          {
            monto: 186.31,
            moneda: 'USD',
            monto_original: 10,
            tipo_cambio: 18.6311001,
          },
          'MONTO_INVALIDO',
        ],
      ]) {
        it(`${method.toUpperCase()} /gastos rechaza ${nombre} con 400 ${codigo}`, async () => {
          const existente =
            method === 'put' ? await ctx.crearGasto() : undefined;
          const antes = await ctx.listar();
          const ruta = existente ? `/gastos/${existente.id}` : '/gastos';

          const res = await ctx.api[method](ruta)
            .auth(ctx.a.token, { type: 'bearer' })
            .send(ctx.gasto(patch));

          expectError(res, 400, codigo);
          assert.deepEqual(await ctx.listar(), antes);
        });
      }
    }

    it('reportes y presupuestos suman monto en MXN sin mezclar monto_original', async () => {
      await ctx.api
        .post('/presupuestos')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          categoria_id: ctx.categoria,
          mes: '2026-10',
          monto_limite: 300,
        })
        .expect(201);

      // Gasto en MXN: 113.69 MXN
      await ctx.crearGasto(ctx.a, { monto: 113.69 });

      // Gasto en USD: 10 USD * 18.6311 = 186.31 MXN -> total 300.00 MXN (100% del presupuesto -> alerta)
      const { body: creacionUsd } = await ctx.api
        .post('/gastos')
        .auth(ctx.a.token, { type: 'bearer' })
        .send(
          ctx.gasto({
            monto: 186.31,
            moneda: 'USD',
            monto_original: 10,
            tipo_cambio: 18.6311,
          })
        )
        .expect(201);

      assert.deepEqual(creacionUsd.alerta, {
        categoria_id: ctx.categoria,
        porcentaje: 100,
        estado: 'alerta',
      });

      const { body: presupuestos } = await ctx.api
        .get('/presupuestos?mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.equal(presupuestos[0].gastado, 300);
      assert.equal(presupuestos[0].porcentaje, 100);
      assert.equal(presupuestos[0].estado, 'alerta');

      const { body: resumen } = await ctx.api
        .get('/reportes/resumen?mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.deepEqual(resumen, {
        mes: '2026-10',
        gasto_variable: 300,
        gasto_fijo: 0,
        total: 300,
      });

      const { body: porCategoria } = await ctx.api
        .get('/reportes/por-categoria?mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.equal(porCategoria.length, 1);
      assert.equal(porCategoria[0].total, 300);
      assert.equal(porCategoria[0].porcentaje, 100);
    });
  });
