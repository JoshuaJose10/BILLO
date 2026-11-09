const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { expectError } = require('../helpers/fixtures.cjs');
const { seedAdmin } = require('../../src/db/seed-admin');

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
    assert.equal(claims.rol, 'usuario');
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
    const claims = jwt.verify(body.token, process.env.JWT_SECRET);
    assert.equal(claims.id, ctx.a.usuario.id);
    assert.equal(claims.rol, 'usuario');
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

  it('seedAdmin crea un administrador cuyo login emite un token con rol: admin y no duplica al ejecutarse dos veces', async () => {
    const emailAdmin = 'admin.qa@example.com';
    const passAdmin = 'AdminSegura123';

    const primera = await seedAdmin({
      email: `  ${emailAdmin.toUpperCase()}  `,
      password: passAdmin,
      nombre: 'Admin QA',
      closePool: false,
    });
    assert.equal(primera.creado, true);
    assert.equal(primera.usuario.email, emailAdmin);
    assert.equal(primera.usuario.rol, 'admin');

    const conteo1 = (
      await ctx.pool.query('SELECT count(*)::int AS count FROM usuarios')
    ).rows[0].count;
    assert.equal(conteo1, 3);

    // Ejecutar por segunda vez no crea otra cuenta
    const segunda = await seedAdmin({
      email: emailAdmin,
      password: passAdmin,
      nombre: 'Admin QA',
      closePool: false,
    });
    assert.equal(segunda.creado, false);
    assert.equal(segunda.usuario.id, primera.usuario.id);
    assert.equal(segunda.usuario.rol, 'admin');

    const conteo2 = (
      await ctx.pool.query('SELECT count(*)::int AS count FROM usuarios')
    ).rows[0].count;
    assert.equal(conteo2, 3);

    // Iniciar sesión devuelve token con rol: admin
    const { body } = await ctx.api
      .post('/auth/login')
      .send({ email: emailAdmin, password: passAdmin })
      .expect(200);
    publicUser(body.usuario);
    assert.equal(body.usuario.email, emailAdmin);
    const claims = jwt.verify(body.token, process.env.JWT_SECRET);
    assert.equal(claims.id, primera.usuario.id);
    assert.equal(claims.rol, 'admin');
  });

  it('seedAdmin promueve una cuenta existente de usuario a admin sin duplicarla', async () => {
    const nuevaPass = 'NuevaAdminPass123';
    const promovido = await seedAdmin({
      email: ctx.a.usuario.email,
      password: nuevaPass,
      closePool: false,
    });

    assert.equal(promovido.creado, false);
    assert.equal(promovido.usuario.id, ctx.a.usuario.id);
    assert.equal(promovido.usuario.rol, 'admin');
    assert.equal(
      (await ctx.pool.query('SELECT count(*)::int AS count FROM usuarios'))
        .rows[0].count,
      2
    );

    const { body } = await ctx.api
      .post('/auth/login')
      .send({ email: ctx.a.usuario.email, password: nuevaPass })
      .expect(200);
    const claims = jwt.verify(body.token, process.env.JWT_SECRET);
    assert.equal(claims.id, ctx.a.usuario.id);
    assert.equal(claims.rol, 'admin');
  });

  for (const [nombreCaso, opciones, patronMensaje] of [
    [
      'sin variables de entorno',
      { email: '', password: '' },
      /ADMIN_EMAIL y ADMIN_PASSWORD/,
    ],
    [
      'sin ADMIN_PASSWORD',
      { email: 'admin@example.com', password: '' },
      /ADMIN_EMAIL y ADMIN_PASSWORD/,
    ],
    [
      'correo inválido',
      { email: 'correo-invalido', password: 'AdminSegura123' },
      /ADMIN_EMAIL no tiene un formato de correo válido/,
    ],
    [
      'contraseña menor a 8 caracteres',
      { email: 'admin@example.com', password: 'corta' },
      /ADMIN_PASSWORD debe tener al menos 8 caracteres/,
    ],
  ]) {
    it(`seedAdmin falla con mensaje claro (${nombreCaso}) sin alterar usuarios`, async () => {
      await assert.rejects(
        seedAdmin({ ...opciones, closePool: false }),
        patronMensaje
      );
      assert.equal(
        (await ctx.pool.query('SELECT count(*)::int AS count FROM usuarios'))
          .rows[0].count,
        2
      );
    });
  }

  it('ejecutar src/db/seed-admin.js por CLI sin variables falla con código 1 y mensaje claro', () => {
    const scriptPath = path.resolve(__dirname, '../../src/db/seed-admin.js');
    const envSinAdmin = { ...process.env };
    delete envSinAdmin.ADMIN_EMAIL;
    delete envSinAdmin.ADMIN_PASSWORD;

    const resultado = spawnSync(process.execPath, [scriptPath], {
      cwd: require('node:os').tmpdir(),
      env: envSinAdmin,
      encoding: 'utf8',
    });

    assert.equal(resultado.status, 1);
    assert.match(resultado.stderr, /ADMIN_EMAIL y ADMIN_PASSWORD/);
  });
});
