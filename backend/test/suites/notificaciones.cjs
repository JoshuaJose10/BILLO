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
  });
