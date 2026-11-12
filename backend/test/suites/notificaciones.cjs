const http = require('node:http');
const { once } = require('node:events');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { expectError } = require('../helpers/fixtures.cjs');
const {
  diasEnMes,
  avanzarFechaCobro,
  calcularDiasParaCobro,
  calcularProximoCobro,
  construirMensajeCobro,
  procesarAvisosCobro,
  iniciarCronAvisoCobros,
} = require('../../src/jobs/avisoCobros');

module.exports = (getContext) =>
  describe('Notificaciones push (RF7 / Migración 011)', () => {
    let ctx;
    beforeEach(async () => {
      ctx = getContext();
      await ctx.reset();
    });

    const obtenerTokenUsuario = async (usuarioId) => {
      const { rows } = await ctx.pool.query(
        'SELECT expo_push_token FROM usuarios WHERE id = $1',
        [usuarioId]
      );
      return rows[0]?.expo_push_token;
    };

    it('Migración 011: aplica las columnas C-01, C-02 y X-01 en el esquema', async () => {
      const { rows } = await ctx.pool.query(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'usuarios' AND column_name = 'expo_push_token')
            OR (table_name = 'membresias' AND column_name = 'ultima_notificacion')
            OR (table_name = 'gastos' AND column_name IN ('moneda', 'monto_original', 'tipo_cambio'))
          )
        ORDER BY table_name, column_name
      `);
      assert.deepEqual(rows, [
        { table_name: 'gastos', column_name: 'moneda' },
        { table_name: 'gastos', column_name: 'monto_original' },
        { table_name: 'gastos', column_name: 'tipo_cambio' },
        { table_name: 'membresias', column_name: 'ultima_notificacion' },
        { table_name: 'usuarios', column_name: 'expo_push_token' },
      ]);
    });

    it('POST /notificaciones/token guarda el token del usuario autenticado y aísla a otros usuarios', async () => {
      const tokenA = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
      const { body } = await ctx.api
        .post('/notificaciones/token')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ expo_push_token: tokenA })
        .expect(200);

      assert.deepEqual(body, { registrado: true });
      assert.equal(await obtenerTokenUsuario(ctx.a.usuario.id), tokenA);
      assert.equal(await obtenerTokenUsuario(ctx.b.usuario.id), null);
    });

    it('POST /notificaciones/token acepta prefijo ExpoPushToken y permite actualizar el token', async () => {
      const tokenInicial = 'ExponentPushToken[token-inicial-123]';
      const tokenNuevo = 'ExpoPushToken[token_nuevo-456]';

      await ctx.api
        .post('/notificaciones/token')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ expo_push_token: tokenInicial })
        .expect(200);
      assert.equal(await obtenerTokenUsuario(ctx.a.usuario.id), tokenInicial);

      const { body } = await ctx.api
        .post('/notificaciones/token')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ expo_push_token: tokenNuevo })
        .expect(200);

      assert.deepEqual(body, { registrado: true });
      assert.equal(await obtenerTokenUsuario(ctx.a.usuario.id), tokenNuevo);
    });

    for (const [nombre, body] of [
      ['sin cuerpo', undefined],
      ['objeto vacío', {}],
      ['nulo', { expo_push_token: null }],
      ['numérico', { expo_push_token: 12345 }],
      ['vacío', { expo_push_token: '' }],
      ['solo espacios', { expo_push_token: '   ' }],
      ['formato ajeno a Expo', { expo_push_token: 'fcm-token-123456' }],
      ['corchetes vacíos', { expo_push_token: 'ExponentPushToken[]' }],
      ['con espacios internos', { expo_push_token: 'ExponentPushToken[abc def]' }],
      ['excede 255 caracteres', { expo_push_token: `ExponentPushToken[${'x'.repeat(250)}]` }],
    ]) {
      it(`POST /notificaciones/token rechaza token inválido (${nombre}) con 400 TOKEN_PUSH_INVALIDO`, async () => {
        const previo = 'ExponentPushToken[token-previo-valido]';
        await ctx.api
          .post('/notificaciones/token')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({ expo_push_token: previo })
          .expect(200);

        const req = ctx.api
          .post('/notificaciones/token')
          .auth(ctx.a.token, { type: 'bearer' });
        const res = await (body === undefined ? req : req.send(body));

        expectError(res, 400, 'TOKEN_PUSH_INVALIDO');
        assert.equal(await obtenerTokenUsuario(ctx.a.usuario.id), previo);
      });
    }

    for (const modo of ['ausente', 'inválido', 'vencido', 'firma ajena', 'sin Bearer']) {
      it(`POST /notificaciones/token con token JWT ${modo} devuelve 401 NO_AUTORIZADO`, async () => {
        const req = ctx.api
          .post('/notificaciones/token')
          .send({ expo_push_token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' });

        if (modo === 'inválido') req.auth('no-es-jwt', { type: 'bearer' });
        if (modo === 'vencido') {
          req.auth(
            jwt.sign({ id: ctx.a.usuario.id }, process.env.JWT_SECRET, { expiresIn: -1 }),
            { type: 'bearer' }
          );
        }
        if (modo === 'firma ajena') {
          req.auth(jwt.sign({ id: ctx.a.usuario.id }, 'otra-clave'), { type: 'bearer' });
        }
        if (modo === 'sin Bearer') req.set('Authorization', ctx.a.token);

        expectError(await req, 401, 'NO_AUTORIZADO');
        assert.equal(await obtenerTokenUsuario(ctx.a.usuario.id), null);
      });
    }

    it('POST /notificaciones/token de usuario eliminado devuelve 404 USUARIO_NO_ENCONTRADO', async () => {
      await ctx.pool.query('DELETE FROM usuarios WHERE id = $1', [ctx.a.usuario.id]);
      const res = await ctx.api
        .post('/notificaciones/token')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ expo_push_token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' });

      expectError(res, 404, 'USUARIO_NO_ENCONTRADO');
    });

    // ── Migración 013: el token pertenece a una sola cuenta ──
    const T = 'ExponentPushToken[telefono-compartido-1]';
    const registrar = (usuario, token = T) =>
      ctx.api
        .post('/notificaciones/token')
        .auth(usuario.token, { type: 'bearer' })
        .send({ expo_push_token: token });
    const eliminar = (usuario, token = T) =>
      ctx.api
        .delete('/notificaciones/token')
        .auth(usuario.token, { type: 'bearer' })
        .send({ expo_push_token: token });

    it('POST /notificaciones/token transfiere el token: A registra T, B registra T → A queda NULL y B con T', async () => {
      await registrar(ctx.a).expect(200);
      const { body } = await registrar(ctx.b).expect(200);

      assert.deepEqual(body, { registrado: true });
      assert.equal(await obtenerTokenUsuario(ctx.a.usuario.id), null);
      assert.equal(await obtenerTokenUsuario(ctx.b.usuario.id), T);
    });

    it('POST /notificaciones/token concurrente de A y B con el mismo token deja un solo dueño', async () => {
      const respuestas = await Promise.all([registrar(ctx.a), registrar(ctx.b)]);
      assert.deepEqual(
        respuestas.map((r) => r.status),
        [200, 200]
      );
      const { rows } = await ctx.pool.query(
        'SELECT id FROM usuarios WHERE expo_push_token = $1',
        [T]
      );
      assert.equal(rows.length, 1);
    });

    it('POST /notificaciones/token de usuario eliminado no le quita el token a otra cuenta', async () => {
      await registrar(ctx.b).expect(200);
      await ctx.pool.query('DELETE FROM usuarios WHERE id = $1', [ctx.a.usuario.id]);

      expectError(await registrar(ctx.a), 404, 'USUARIO_NO_ENCONTRADO');
      assert.equal(await obtenerTokenUsuario(ctx.b.usuario.id), T);
    });

    it('DELETE /notificaciones/token borra el token del usuario autenticado', async () => {
      await registrar(ctx.a).expect(200);
      const { body } = await eliminar(ctx.a).expect(200);

      assert.deepEqual(body, { eliminado: true });
      assert.equal(await obtenerTokenUsuario(ctx.a.usuario.id), null);
    });

    it('DELETE /notificaciones/token de A no toca el token de B (ya transferido)', async () => {
      await registrar(ctx.a).expect(200);
      await registrar(ctx.b).expect(200);

      const { body } = await eliminar(ctx.a).expect(200);
      assert.deepEqual(body, { eliminado: true });
      assert.equal(await obtenerTokenUsuario(ctx.b.usuario.id), T);
    });

    it('DELETE /notificaciones/token con un token distinto al guardado responde 200 sin cambios', async () => {
      await registrar(ctx.a).expect(200);
      await eliminar(ctx.a, 'ExponentPushToken[otro-telefono]').expect(200);
      assert.equal(await obtenerTokenUsuario(ctx.a.usuario.id), T);
    });

    it('DELETE /notificaciones/token repetido es idempotente', async () => {
      await registrar(ctx.a).expect(200);
      for (let i = 0; i < 2; i++) {
        const { body } = await eliminar(ctx.a).expect(200);
        assert.deepEqual(body, { eliminado: true });
      }
      assert.equal(await obtenerTokenUsuario(ctx.a.usuario.id), null);
    });

    for (const [nombre, body] of [
      ['sin cuerpo', undefined],
      ['formato ajeno a Expo', { expo_push_token: 'fcm-token-123456' }],
      ['nulo', { expo_push_token: null }],
    ]) {
      it(`DELETE /notificaciones/token rechaza token inválido (${nombre}) con 400 TOKEN_PUSH_INVALIDO`, async () => {
        await registrar(ctx.a).expect(200);
        const req = ctx.api
          .delete('/notificaciones/token')
          .auth(ctx.a.token, { type: 'bearer' });
        expectError(await (body === undefined ? req : req.send(body)), 400, 'TOKEN_PUSH_INVALIDO');
        assert.equal(await obtenerTokenUsuario(ctx.a.usuario.id), T);
      });
    }

    it('DELETE /notificaciones/token sin JWT devuelve 401 NO_AUTORIZADO', async () => {
      await registrar(ctx.a).expect(200);
      const res = await ctx.api.delete('/notificaciones/token').send({ expo_push_token: T });
      expectError(res, 401, 'NO_AUTORIZADO');
      assert.equal(await obtenerTokenUsuario(ctx.a.usuario.id), T);
    });

    it('Migración 013: el índice único impide que dos cuentas guarden el mismo token', async () => {
      await ctx.pool.query('UPDATE usuarios SET expo_push_token = $1 WHERE id = $2', [
        T,
        ctx.a.usuario.id,
      ]);
      await assert.rejects(
        ctx.pool.query('UPDATE usuarios SET expo_push_token = $1 WHERE id = $2', [
          T,
          ctx.b.usuario.id,
        ]),
        { code: '23505' }
      );
      // Varios NULL siguen permitidos (índice parcial).
      const { rows } = await ctx.pool.query(
        'SELECT count(*)::int AS n FROM usuarios WHERE expo_push_token IS NULL'
      );
      assert.ok(rows[0].n >= 1);
    });

    it('Migración 013: limpia duplicados existentes (NULL) y conserva tokens únicos', async () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const sql = fs.readFileSync(
        path.resolve(__dirname, '../../migrations/013_token_push_unico.sql'),
        'utf8'
      );
      const unico = 'ExponentPushToken[solo-de-a]';
      const client = await ctx.pool.connect();
      try {
        // Se simula una base anterior a 013 dentro de una transacción que se revierte.
        await client.query('BEGIN');
        await client.query('DROP INDEX idx_usuarios_expo_push_token_unico');
        await client.query('UPDATE usuarios SET expo_push_token = $1 WHERE id = ANY($2)', [
          T,
          [ctx.a.usuario.id, ctx.b.usuario.id],
        ]);
        const c = await client.query(
          `INSERT INTO usuarios (nombre, email, password_hash, expo_push_token)
           VALUES ('Usuario C', 'c@example.com', 'x', $1) RETURNING id`,
          [unico]
        );
        await client.query(sql);

        const { rows } = await client.query(
          'SELECT expo_push_token FROM usuarios WHERE id = ANY($1) ORDER BY id',
          [[ctx.a.usuario.id, ctx.b.usuario.id, c.rows[0].id]]
        );
        assert.deepEqual(
          rows.map((r) => r.expo_push_token),
          [null, null, unico]
        );
        const indice = await client.query(
          "SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_usuarios_expo_push_token_unico'"
        );
        assert.match(indice.rows[0].indexdef, /UNIQUE INDEX .*WHERE \(expo_push_token IS NOT NULL\)/);
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
    });

    // ── Proceso diario de avisos de cobro y cálculo de ciclos (RF7 / HU-46) ──
    describe('Cálculo de fechas y siguiente ciclo (RF7 / HU-51)', () => {
      it('diasEnMes calcula correctamente meses de 28, 29, 30 y 31 días', () => {
        assert.equal(diasEnMes(2026, 1), 31);
        assert.equal(diasEnMes(2026, 2), 28);
        assert.equal(diasEnMes(2024, 2), 29); // año bisiesto
        assert.equal(diasEnMes(2026, 4), 30);
        assert.equal(diasEnMes(2026, 11), 30);
        assert.equal(diasEnMes(2026, 12), 31);
      });

      it('avanzarFechaCobro conserva fechas futuras o iguales a hoy sin modificarlas', () => {
        assert.equal(avanzarFechaCobro('2026-11-10', 'mensual', '2026-11-10'), '2026-11-10');
        assert.equal(avanzarFechaCobro('2026-11-12', 'mensual', '2026-11-10'), '2026-11-12');
        assert.equal(avanzarFechaCobro('2027-05-01', 'anual', '2026-11-10'), '2027-05-01');
      });

      it('avanzarFechaCobro avanza membresías mensuales vencidas cuidando el fin de mes (31 → 28, 29 o 30)', () => {
        // 31 de enero -> 28 de febrero en año no bisiesto (2026)
        assert.equal(avanzarFechaCobro('2026-01-31', 'mensual', '2026-02-15'), '2026-02-28');
        // 31 de enero -> 29 de febrero en año bisiesto (2024)
        assert.equal(avanzarFechaCobro('2024-01-31', 'mensual', '2024-02-15'), '2024-02-29');
        // 31 de marzo -> 30 de abril
        assert.equal(avanzarFechaCobro('2026-03-31', 'mensual', '2026-04-10'), '2026-04-30');
        // 31 de mayo -> 30 de junio
        assert.equal(avanzarFechaCobro('2026-05-31', 'mensual', '2026-06-10'), '2026-06-30');
        // Salto de varios meses desde 31 de enero hasta marzo recupera el día 31
        assert.equal(avanzarFechaCobro('2026-01-31', 'mensual', '2026-03-01'), '2026-03-31');
        // Salto de varios meses desde 31 de enero hasta abril ajusta a 30
        assert.equal(avanzarFechaCobro('2026-01-31', 'mensual', '2026-04-01'), '2026-04-30');
        // Cambio de año diciembre -> enero
        assert.equal(avanzarFechaCobro('2026-12-31', 'mensual', '2027-01-10'), '2027-01-31');
      });

      it('avanzarFechaCobro avanza membresías anuales vencidas 1 o más años (incluyendo 29 feb → 28 feb)', () => {
        assert.equal(avanzarFechaCobro('2025-11-12', 'anual', '2026-11-10'), '2026-11-12');
        assert.equal(avanzarFechaCobro('2025-10-01', 'anual', '2026-11-10'), '2027-10-01');
        assert.equal(avanzarFechaCobro('2024-02-29', 'anual', '2025-01-01'), '2025-02-28');
        assert.equal(avanzarFechaCobro('2024-02-29', 'anual', '2028-01-01'), '2028-02-29');
      });

      it('calcularDiasParaCobro y calcularProximoCobro determinan ventana de 0 a 3 días', () => {
        assert.equal(calcularDiasParaCobro('2026-11-10', '2026-11-10'), 0);
        assert.equal(calcularDiasParaCobro('2026-11-12', '2026-11-10'), 2);
        assert.equal(calcularDiasParaCobro('2026-11-20', '2026-11-10'), 10);

        const proximoEn2Dias = calcularProximoCobro('2026-10-12', 'mensual', '2026-11-10');
        assert.deepEqual(proximoEn2Dias, {
          fecha_cobro: '2026-11-12',
          fecha_cobro_original: '2026-10-12',
          avanzada: true,
          dias_para_cobro: 2,
          requiere_aviso: true,
        });

        const proximoEn10Dias = calcularProximoCobro('2026-11-20', 'mensual', '2026-11-10');
        assert.equal(proximoEn10Dias.avanzada, false);
        assert.equal(proximoEn10Dias.dias_para_cobro, 10);
        assert.equal(proximoEn10Dias.requiere_aviso, false);
      });

      it('construirMensajeCobro formatea nombre, días y monto según el contrato («Netflix se cobra en 2 días: $199»)', () => {
        assert.equal(
          construirMensajeCobro('Netflix', 199, 2),
          'Netflix se cobra en 2 días: $199'
        );
        assert.equal(
          construirMensajeCobro('Spotify', '129.00', 0),
          'Spotify se cobra hoy: $129'
        );
        assert.equal(
          construirMensajeCobro('Disney+', 219.5, 1),
          'Disney+ se cobra en 1 día: $219.50'
        );
      });
    });

    describe('Proceso diario procesarAvisosCobro (RF7)', () => {
      const crearMembresiaDirecta = async ({
        usuarioId,
        nombre = 'Netflix',
        costo = 199,
        frecuencia = 'mensual',
        fecha_cobro,
        ultima_notificacion = null,
      }) => {
        const { rows } = await ctx.pool.query(
          `INSERT INTO membresias (usuario_id, nombre, costo, frecuencia, fecha_cobro, ultima_notificacion)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [usuarioId, nombre, costo, frecuencia, fecha_cobro, ultima_notificacion]
        );
        return rows[0].id;
      };

      it('una membresía a 2 días genera un solo aviso al día y guarda ultima_notificacion', async () => {
        const tokenA = 'ExponentPushToken[token-usuario-a]';
        await registrar(ctx.a, tokenA).expect(200);

        const membresiaId = await crearMembresiaDirecta({
          usuarioId: ctx.a.usuario.id,
          nombre: 'Netflix',
          costo: 199,
          frecuencia: 'mensual',
          fecha_cobro: '2026-11-12',
        });

        const recibidos = [];
        const mockServer = http.createServer((req, res) => {
          let raw = '';
          req.on('data', (chunk) => {
            raw += chunk;
          });
          req.on('end', () => {
            recibidos.push(JSON.parse(raw));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: { status: 'ok', id: 'ticket-1' } }));
          });
        });
        mockServer.listen(0, '127.0.0.1');
        await once(mockServer, 'listening');
        const urlExpo = `http://127.0.0.1:${mockServer.address().port}/--/api/v2/push/send`;

        try {
          // Primera ejecución en el día 2026-11-10 -> envía 1 aviso
          const res1 = await procesarAvisosCobro({
            fechaReferencia: '2026-11-10',
            pool: ctx.pool,
            urlExpo,
            logger: { error: () => {} },
          });

          assert.equal(res1.enviadas, 1);
          assert.equal(res1.yaNotificadas, 0);
          assert.equal(recibidos.length, 1);
          assert.equal(recibidos[0].to, tokenA);
          assert.equal(recibidos[0].title, 'Cobro próximo');
          assert.equal(recibidos[0].body, 'Netflix se cobra en 2 días: $199');
          assert.deepEqual(recibidos[0].data, {
            tipo: 'cobro',
            membresia_id: membresiaId,
          });

          const { rows } = await ctx.pool.query(
            "SELECT TO_CHAR(ultima_notificacion, 'YYYY-MM-DD') AS ultima_notificacion FROM membresias WHERE id = $1",
            [membresiaId]
          );
          assert.equal(rows[0].ultima_notificacion, '2026-11-10');

          // Segunda ejecución el mismo día -> no vuelve a avisar
          const res2 = await procesarAvisosCobro({
            fechaReferencia: '2026-11-10',
            pool: ctx.pool,
            urlExpo,
            logger: { error: () => {} },
          });

          assert.equal(res2.enviadas, 0);
          assert.equal(res2.yaNotificadas, 1);
          assert.equal(recibidos.length, 1);
        } finally {
          await new Promise((resolve) => mockServer.close(resolve));
        }
      });

      it('una membresía a 10 días no genera aviso', async () => {
        await registrar(ctx.a, 'ExponentPushToken[token-usuario-a]').expect(200);
        const membresiaId = await crearMembresiaDirecta({
          usuarioId: ctx.a.usuario.id,
          nombre: 'Spotify',
          costo: 129,
          frecuencia: 'mensual',
          fecha_cobro: '2026-11-20',
        });

        let llamadas = 0;
        const fetchMock = async () => {
          llamadas++;
          throw new Error('No debía llamarse a Expo');
        };

        const resumen = await procesarAvisosCobro({
          fechaReferencia: '2026-11-10',
          pool: ctx.pool,
          fetchImpl: fetchMock,
          logger: { error: () => {} },
        });

        assert.equal(resumen.enviadas, 0);
        assert.equal(resumen.fueraDeRango, 1);
        assert.equal(llamadas, 0);

        const { rows } = await ctx.pool.query(
          'SELECT ultima_notificacion FROM membresias WHERE id = $1',
          [membresiaId]
        );
        assert.equal(rows[0].ultima_notificacion, null);
      });

      it('si un usuario no tiene token o Expo falla, registra el error y sigue con los demás sin tumbar el proceso', async () => {
        // Usuario A no tiene token; Usuario B sí tiene token con 2 membresías (la primera falla en Expo, la segunda pasa)
        const tokenB = 'ExponentPushToken[token-usuario-b]';
        await registrar(ctx.b, tokenB).expect(200);

        await crearMembresiaDirecta({
          usuarioId: ctx.a.usuario.id,
          nombre: 'SinToken',
          costo: 99,
          frecuencia: 'mensual',
          fecha_cobro: '2026-11-12',
        });
        const idFalla = await crearMembresiaDirecta({
          usuarioId: ctx.b.usuario.id,
          nombre: 'FallaExpo',
          costo: 149,
          frecuencia: 'mensual',
          fecha_cobro: '2026-11-12',
        });
        const idExito = await crearMembresiaDirecta({
          usuarioId: ctx.b.usuario.id,
          nombre: 'ExitoExpo',
          costo: 199,
          frecuencia: 'mensual',
          fecha_cobro: '2026-11-12',
        });

        const erroresRegistrados = [];
        let intento = 0;
        const fetchMock = async () => {
          intento++;
          if (intento === 1) {
            return {
              ok: false,
              status: 503,
              json: async () => ({}),
            };
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { status: 'ok', id: 'ticket-ok' } }),
          };
        };

        const resumen = await procesarAvisosCobro({
          fechaReferencia: '2026-11-10',
          pool: ctx.pool,
          fetchImpl: fetchMock,
          logger: { error: (msg) => erroresRegistrados.push(msg) },
        });

        assert.equal(resumen.revisadas, 3);
        assert.equal(resumen.sinToken, 1);
        assert.equal(resumen.errores, 1);
        assert.equal(resumen.enviadas, 1);
        assert.equal(erroresRegistrados.length, 2);

        const { rows: filaFalla } = await ctx.pool.query(
          'SELECT ultima_notificacion FROM membresias WHERE id = $1',
          [idFalla]
        );
        assert.equal(filaFalla[0].ultima_notificacion, null);

        const { rows: filaExito } = await ctx.pool.query(
          "SELECT TO_CHAR(ultima_notificacion, 'YYYY-MM-DD') AS ultima_notificacion FROM membresias WHERE id = $1",
          [idExito]
        );
        assert.equal(filaExito[0].ultima_notificacion, '2026-11-10');
      });

      it('avanza en la BD membresías cuya fecha_cobro ya pasó (mensual en fin de mes y anual) y notifica si faltan <= 3 días', async () => {
        const tokenA = 'ExponentPushToken[token-ciclo-a]';
        await registrar(ctx.a, tokenA).expect(200);

        // Membresía mensual del 31 de enero evaluada el 26 de febrero de 2026 -> avanza a 2026-02-28 (faltan 2 días)
        const idFinMes = await crearMembresiaDirecta({
          usuarioId: ctx.a.usuario.id,
          nombre: 'Prime Video',
          costo: 99,
          frecuencia: 'mensual',
          fecha_cobro: '2026-01-31',
        });

        // Membresía anual del 2025-02-27 evaluada el 2026-02-26 -> avanza a 2026-02-27 (falta 1 día)
        const idAnual = await crearMembresiaDirecta({
          usuarioId: ctx.a.usuario.id,
          nombre: 'Disney+ Anual',
          costo: 1599,
          frecuencia: 'anual',
          fecha_cobro: '2025-02-27',
        });

        const enviados = [];
        const fetchMock = async (_url, opts) => {
          enviados.push(JSON.parse(opts.body));
          return {
            ok: true,
            status: 200,
            json: async () => ({ data: { status: 'ok' } }),
          };
        };

        const resumen = await procesarAvisosCobro({
          fechaReferencia: '2026-02-26',
          pool: ctx.pool,
          fetchImpl: fetchMock,
          logger: { error: () => {} },
        });

        assert.equal(resumen.avanzadas, 2);
        assert.equal(resumen.enviadas, 2);
        assert.deepEqual(
          enviados.map((e) => e.body),
          [
            'Prime Video se cobra en 2 días: $99',
            'Disney+ Anual se cobra en 1 día: $1599',
          ]
        );

        const { rows } = await ctx.pool.query(
          "SELECT id, TO_CHAR(fecha_cobro, 'YYYY-MM-DD') AS fecha_cobro, TO_CHAR(ultima_notificacion, 'YYYY-MM-DD') AS ultima_notificacion FROM membresias WHERE id = ANY($1) ORDER BY id ASC",
          [[idFinMes, idAnual]]
        );
        assert.deepEqual(rows, [
          {
            id: idFinMes,
            fecha_cobro: '2026-02-28',
            ultima_notificacion: '2026-02-26',
          },
          {
            id: idAnual,
            fecha_cobro: '2026-02-27',
            ultima_notificacion: '2026-02-26',
          },
        ]);
      });

      it('iniciarCronAvisoCobros permite programar y detener el proceso periódico', () => {
        const cron = iniciarCronAvisoCobros({
          intervaloMs: 60000,
          ejecutarAlIniciar: false,
        });
        assert.equal(typeof cron.detener, 'function');
        cron.detener();
      });
    });
  });
