const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { expectError } = require('../helpers/fixtures.cjs');

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
  });
