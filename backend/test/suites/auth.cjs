const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { expectError } = require('../helpers/fixtures.cjs');

module.exports = getContext => describe('Autenticación (Postman 01 / RF1)', () => {
  let ctx;
  beforeEach(async () => { ctx = getContext(); await ctx.reset(); });
  const registro = overrides => ({ nombre: 'Ana', email: 'ana@example.com',
    password: 'Segura123', ...overrides });
  function publicUser(usuario) {
    assert.deepEqual(Object.keys(usuario).sort(), ['email', 'id', 'nombre']);
    assert.equal(typeof usuario.id, 'number');
  }

  it('AUTH-QA-01 / CP-RF1-01: registro devuelve usuario y JWT utilizable', async () => {
    const { body } = await ctx.api.post('/auth/register').send(registro()).expect(201);
    publicUser(body.usuario);
    assert.equal(body.usuario.email, 'ana@example.com');
    assert.equal(body.usuario.nombre, 'Ana');
    const claims = jwt.verify(body.token, process.env.JWT_SECRET);
    assert.equal(claims.id, body.usuario.id);
    const perfil = await ctx.api.get('/auth/perfil').auth(body.token, { type: 'bearer' }).expect(200);
    assert.deepEqual(perfil.body, body.usuario);
    const { rows } = await ctx.pool.query('SELECT password_hash FROM usuarios WHERE id=$1', [body.usuario.id]);
    assert.notEqual(rows[0].password_hash, ctx.password);
    assert.ok(await bcrypt.compare(ctx.password, rows[0].password_hash));
  });

  it('registro normaliza correo y permite login con mayúsculas y espacios', async () => {
    await ctx.api.post('/auth/register').send(registro({ email: ' Ana@EXAMPLE.com ' })).expect(201);
    const { body } = await ctx.api.post('/auth/login')
      .send({ email: ' ANA@example.COM ', password: ctx.password }).expect(200);
    assert.equal(body.usuario.email, 'ana@example.com');
  });

  it('CP-RF1-03: correo duplicado ignora mayúsculas', async () => {
    expectError(await ctx.api.post('/auth/register').send(registro({ email: ' A@EXAMPLE.COM ' })),
      409, 'EMAIL_DUPLICADO');
    assert.equal((await ctx.pool.query('SELECT count(*)::int AS count FROM usuarios')).rows[0].count, 2);
  });

  for (const [name, patch, code] of [
    ['nombre vacío', { nombre: '' }, 'NOMBRE_REQUERIDO'],
    ['nombre con espacios', { nombre: '   ' }, 'NOMBRE_REQUERIDO'],
    ['nombre no textual', { nombre: 123 }, 'NOMBRE_REQUERIDO'],
    ['correo inválido', { email: 'no-es-correo' }, 'EMAIL_INVALIDO'],
    ['correo ausente', { email: null }, 'EMAIL_INVALIDO'],
    ['contraseña corta', { password: '1234567' }, 'PASSWORD_MUY_CORTA'],
    ['contraseña no textual', { password: 12345678 }, 'PASSWORD_MUY_CORTA'],
  ]) {
    it(`AUTH-QA-02: registro rechaza ${name} sin insertar usuario`, async () => {
      expectError(await ctx.api.post('/auth/register').send(registro(patch)), 400, code);
      assert.equal((await ctx.pool.query('SELECT count(*)::int AS count FROM usuarios')).rows[0].count, 2);
    });
  }

  it('registro sin cuerpo responde 400 estructurado', async () => {
    expectError(await ctx.api.post('/auth/register'), 400, 'NOMBRE_REQUERIDO');
  });
  it('contraseña de exactamente ocho caracteres es válida', async () => {
    await ctx.api.post('/auth/register').send(registro({ password: '12345678' })).expect(201);
  });
  it('CP-RF1-02: login devuelve solo datos públicos y token válido', async () => {
    const { body } = await ctx.api.post('/auth/login')
      .send({ email: ctx.a.usuario.email, password: ctx.password }).expect(200);
    publicUser(body.usuario);
    assert.deepEqual(body.usuario, ctx.a.usuario);
    assert.equal(jwt.verify(body.token, process.env.JWT_SECRET).id, ctx.a.usuario.id);
  });
  it('CP-RF1-04: correo inexistente y contraseña incorrecta dan el mismo error', async () => {
    const wrong = await ctx.api.post('/auth/login').send({ email: ctx.a.usuario.email, password: 'incorrecta' });
    const missing = await ctx.api.post('/auth/login').send({ email: 'nadie@example.com', password: ctx.password });
    expectError(wrong, 401, 'CREDENCIALES_INVALIDAS');
    expectError(missing, 401, 'CREDENCIALES_INVALIDAS');
    assert.deepEqual(wrong.body, missing.body);
  });
  for (const [name, body] of [
    ['sin cuerpo', undefined], ['sin email', { password: 'Segura123' }],
    ['sin contraseña', { email: 'a@example.com' }],
    ['campos de tipo incorrecto', { email: true, password: 123 }],
  ]) {
    it(`login ${name} responde 400`, async () => {
      const req = ctx.api.post('/auth/login');
      expectError(await (body === undefined ? req : req.send(body)), 400, 'CAMPOS_REQUERIDOS');
    });
  }
  for (const user of ['a', 'b']) {
    it(`AUTH-QA-03: /auth/perfil identifica únicamente al usuario ${user.toUpperCase()}`, async () => {
      const { body } = await ctx.api.get('/auth/perfil').auth(ctx[user].token, { type: 'bearer' }).expect(200);
      publicUser(body);
      assert.deepEqual(body, ctx[user].usuario);
    });
  }
  it('/auth/profile conserva el alias temporal', async () => {
    const { body } = await ctx.api.get('/auth/profile').auth(ctx.a.token, { type: 'bearer' }).expect(200);
    assert.deepEqual(body, ctx.a.usuario);
  });
  for (const mode of ['ausente', 'inválido', 'vencido', 'firma ajena', 'sin Bearer']) {
    it(`perfil con token ${mode} devuelve NO_AUTORIZADO`, async () => {
      const req = ctx.api.get('/auth/perfil');
      if (mode === 'inválido') req.auth('no-es-jwt', { type: 'bearer' });
      if (mode === 'vencido') req.auth(jwt.sign({ id: ctx.a.usuario.id }, process.env.JWT_SECRET,
        { expiresIn: -1 }), { type: 'bearer' });
      if (mode === 'firma ajena') req.auth(jwt.sign({ id: ctx.a.usuario.id }, 'otra-clave'), { type: 'bearer' });
      if (mode === 'sin Bearer') req.set('Authorization', ctx.a.token);
      expectError(await req, 401, 'NO_AUTORIZADO');
    });
  }
  it('perfil de usuario eliminado devuelve 404', async () => {
    await ctx.pool.query('DELETE FROM usuarios WHERE id=$1', [ctx.a.usuario.id]);
    expectError(await ctx.api.get('/auth/perfil').auth(ctx.a.token, { type: 'bearer' }),
      404, 'USUARIO_NO_ENCONTRADO');
  });
});
