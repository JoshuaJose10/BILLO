const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { expectError } = require('../helpers/fixtures.cjs');
const { seedAdmin } = require('../../src/db/seed-admin');
const {
  BREVO_API_URL,
  MAX_SOLICITUDES_POR_CORREO,
  hashearTokenRecuperacion,
  enviarCorreoRecuperacion,
  obtenerUltimoCorreoEnviado,
} = require('../../src/services/recuperacion.service');

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
    assert.deepEqual(Object.keys(body.usuario).sort(), [
      'categorias_configuradas',
      'email',
      'id',
      'nombre',
    ]);
    assert.equal(typeof body.usuario.id, 'number');
    assert.equal(body.usuario.email, 'ana@example.com');
    assert.equal(body.usuario.nombre, 'Ana');
    assert.equal(body.usuario.categorias_configuradas, false);
    const claims = jwt.verify(body.token, process.env.JWT_SECRET);
    assert.equal(claims.id, body.usuario.id);
    assert.equal(claims.rol, 'usuario');
    const perfil = await ctx.api.get('/auth/perfil').auth(body.token, { type: 'bearer' }).expect(200);
    publicUser(perfil.body);
    assert.deepEqual(perfil.body, {
      id: body.usuario.id,
      nombre: body.usuario.nombre,
      email: body.usuario.email,
    });
    const { rows } = await ctx.pool.query('SELECT password_hash FROM usuarios WHERE id=$1', [body.usuario.id]);
    assert.notEqual(rows[0].password_hash, ctx.password);
    assert.ok(await bcrypt.compare(ctx.password, rows[0].password_hash));
  });

  it('registro deja la cuenta nueva con las categorías predefinidas de gasto seleccionadas', async () => {
    const { body } = await ctx.api.post('/auth/register').send(registro()).expect(201);
    assert.equal(body.usuario.categorias_configuradas, false);
    const { body: categorias } = await ctx.api.get('/categorias?tipo=gasto')
      .auth(body.token, { type: 'bearer' }).expect(200);
    assert.ok(categorias.length > 0, 'una cuenta nueva no debe quedar sin categorías');
    assert.ok(categorias.every(c => c.es_predefinida === true));
    const { rows } = await ctx.pool.query(
      "SELECT COUNT(*)::int AS n FROM categorias WHERE es_predefinida = TRUE AND usuario_id IS NULL AND tipo = 'gasto'");
    assert.equal(categorias.length, rows[0].n);
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
    assert.deepEqual(body.usuario, {
      ...ctx.a.usuario,
      rol: 'usuario',
      categorias_configuradas: true,
    });
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

    // Iniciar sesión devuelve token y usuario con rol: admin
    const { body } = await ctx.api
      .post('/auth/login')
      .send({ email: emailAdmin, password: passAdmin })
      .expect(200);
    assert.deepEqual(Object.keys(body.usuario).sort(), [
      'categorias_configuradas',
      'email',
      'id',
      'nombre',
      'rol',
    ]);
    assert.equal(body.usuario.email, emailAdmin);
    assert.equal(body.usuario.rol, 'admin');
    assert.equal(body.usuario.categorias_configuradas, true);
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
    assert.equal(body.usuario.rol, 'admin');
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

  // ── Recuperación de contraseña (migración 014 + Brevo HTTP API) ──

  it('Migración 014: agrega reset_token_hash y reset_token_expira en usuarios', async () => {
    const { rows } = await ctx.pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'usuarios'
        AND column_name IN ('reset_token_hash', 'reset_token_expira')
      ORDER BY column_name
    `);
    assert.deepEqual(rows, [
      { column_name: 'reset_token_expira' },
      { column_name: 'reset_token_hash' },
    ]);
  });

  it('Migración 016: invalida códigos ambiguos de una base existente y conserva códigos nuevos al reaplicarse', async () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../migrations/016_recuperacion_zona_horaria.sql'),
      'utf8'
    );
    const client = await ctx.pool.connect();
    try {
      await client.query('BEGIN');
      const originales = await client.query(
        'SELECT id, email, password_hash FROM usuarios ORDER BY id'
      );
      // Simular el esquema anterior dentro de la base temporal; se revierte al terminar.
      await client.query(`
        ALTER TABLE usuarios ALTER COLUMN reset_token_expira TYPE TIMESTAMP
        USING reset_token_expira AT TIME ZONE 'UTC'
      `);
      await client.query(`
        UPDATE usuarios SET reset_token_hash = 'codigo-anterior',
          reset_token_expira = TIMESTAMP '2026-11-12 12:30:00'
      `);
      await client.query(sql);
      const tipo = await client.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'usuarios'
          AND column_name = 'reset_token_expira'
      `);
      assert.equal(tipo.rows[0].data_type, 'timestamp with time zone');
      const invalidados = await client.query(
        'SELECT reset_token_hash, reset_token_expira FROM usuarios ORDER BY id'
      );
      assert.deepEqual(invalidados.rows, originales.rows.map(() => ({
        reset_token_hash: null, reset_token_expira: null,
      })));
      const usuarios = await client.query(
        'SELECT id, email, password_hash FROM usuarios ORDER BY id'
      );
      assert.deepEqual(usuarios.rows, originales.rows);

      const nuevo = await client.query(`
        UPDATE usuarios SET reset_token_hash = 'codigo-nuevo',
          reset_token_expira = NOW() + INTERVAL '30 minutes'
        WHERE id = $1 RETURNING reset_token_hash, reset_token_expira
      `, [ctx.a.usuario.id]);
      await client.query(sql);
      const conservado = await client.query(
        'SELECT reset_token_hash, reset_token_expira FROM usuarios WHERE id = $1',
        [ctx.a.usuario.id]
      );
      assert.deepEqual(conservado.rows, nuevo.rows);
    } finally {
      try { await client.query('ROLLBACK'); } finally { client.release(); }
    }
  });

  for (const zona of ['UTC', 'America/Mexico_City']) {
    it(`Recuperación: respeta vencimiento y vigencia con PostgreSQL en ${zona}`, async () => {
      await ctx.api.post('/auth/olvide-contrasena')
        .send({ email: ctx.a.usuario.email }).expect(200);
      const { token } = obtenerUltimoCorreoEnviado();

      async function ajustarVencimiento(minutos) {
        const client = await ctx.pool.connect();
        try {
          await client.query('BEGIN');
          await client.query("SELECT set_config('TimeZone', $1, true)", [zona]);
          await client.query(`
            UPDATE usuarios
            SET reset_token_expira = NOW() + $1 * INTERVAL '1 minute'
            WHERE id = $2
          `, [minutos, ctx.a.usuario.id]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally {
          client.release();
        }
      }

      await ajustarVencimiento(-1);
      expectError(await ctx.api.post('/auth/restablecer-contrasena')
        .send({ token, password: 'NuevaPasswordSegura99' }), 400, 'TOKEN_INVALIDO');
      await ctx.api.post('/auth/login')
        .send({ email: ctx.a.usuario.email, password: ctx.password }).expect(200);

      await ajustarVencimiento(30);
      await ctx.api.post('/auth/restablecer-contrasena')
        .send({ token, password: 'NuevaPasswordSegura99' }).expect(200);
      await ctx.api.post('/auth/login')
        .send({ email: ctx.a.usuario.email, password: 'NuevaPasswordSegura99' }).expect(200);
    });
  }

  it('Flujo completo: pedir código → verificar hash y caducidad 30 min → restablecer → iniciar sesión', async () => {
    const antesMs = Date.now();
    const resOlvide = await ctx.api
      .post('/auth/olvide-contrasena')
      .send({ email: `  ${ctx.a.usuario.email.toUpperCase()}  ` })
      .expect(200);

    assert.equal(resOlvide.body.enviado, true);
    assert.equal(typeof resOlvide.body.message, 'string');

    const correo = obtenerUltimoCorreoEnviado();
    assert.ok(correo, 'Debe haberse emitido el correo de recuperación');
    assert.equal(correo.email, ctx.a.usuario.email);
    assert.match(correo.token, /^\d{6}$/);

    // En la base de datos solo se guarda el hash SHA-256 y la caducidad (~30 min), nunca el token en claro
    const { rows } = await ctx.pool.query(
      'SELECT reset_token_hash, reset_token_expira FROM usuarios WHERE id = $1',
      [ctx.a.usuario.id]
    );
    assert.notEqual(rows[0].reset_token_hash, correo.token);
    assert.equal(rows[0].reset_token_hash, hashearTokenRecuperacion(correo.token));
    const expiraMs = new Date(rows[0].reset_token_expira).getTime();
    const diferenciaMinutos = (expiraMs - antesMs) / (60 * 1000);
    assert.ok(
      diferenciaMinutos >= 29 && diferenciaMinutos <= 31,
      `La caducidad debe ser de ~30 min (fue ${diferenciaMinutos.toFixed(2)} min)`
    );

    // Restablecer la contraseña con el token recibido
    const nuevaPassword = 'NuevaPasswordSegura99';
    const resRestablecer = await ctx.api
      .post('/auth/restablecer-contrasena')
      .send({ token: correo.token, password: nuevaPassword })
      .expect(200);

    assert.equal(resRestablecer.body.restablecida, true);

    // El token queda invalidado en la base de datos inmediatamente después de usarse
    const postReset = await ctx.pool.query(
      'SELECT reset_token_hash, reset_token_expira FROM usuarios WHERE id = $1',
      [ctx.a.usuario.id]
    );
    assert.equal(postReset.rows[0].reset_token_hash, null);
    assert.equal(postReset.rows[0].reset_token_expira, null);

    // La contraseña anterior ya no funciona y la nueva permite iniciar sesión
    expectError(
      await ctx.api
        .post('/auth/login')
        .send({ email: ctx.a.usuario.email, password: ctx.password }),
      401,
      'CREDENCIALES_INVALIDAS'
    );

    const loginNuevo = await ctx.api
      .post('/auth/login')
      .send({ email: ctx.a.usuario.email, password: nuevaPassword })
      .expect(200);
    assert.equal(loginNuevo.body.usuario.id, ctx.a.usuario.id);
  });

  it('Token reutilizado o inexistente devuelve 400 TOKEN_INVALIDO', async () => {
    await ctx.api
      .post('/auth/olvide')
      .send({ email: ctx.a.usuario.email })
      .expect(200);
    const { token } = obtenerUltimoCorreoEnviado();

    await ctx.api
      .post('/auth/restablecer')
      .send({ token, password: 'PrimeraNuevaPassword1' })
      .expect(200);

    // Intentar reutilizar el mismo token responde 400 TOKEN_INVALIDO
    const reuso = await ctx.api
      .post('/auth/restablecer-contrasena')
      .send({ token, password: 'SegundaNuevaPassword2' });
    expectError(reuso, 400, 'TOKEN_INVALIDO');

    // Sigue vigente PrimeraNuevaPassword1
    await ctx.api
      .post('/auth/login')
      .send({ email: ctx.a.usuario.email, password: 'PrimeraNuevaPassword1' })
      .expect(200);
  });

  it('Token vencido devuelve 400 TOKEN_INVALIDO y no cambia la contraseña', async () => {
    await ctx.api
      .post('/auth/olvide-contrasena')
      .send({ email: ctx.a.usuario.email })
      .expect(200);
    const { token } = obtenerUltimoCorreoEnviado();

    // Simular que ya pasaron más de 30 minutos
    await ctx.pool.query(
      'UPDATE usuarios SET reset_token_expira = $1 WHERE id = $2',
      [new Date(Date.now() - 60000), ctx.a.usuario.id]
    );

    const vencido = await ctx.api
      .post('/auth/restablecer-contrasena')
      .send({ token, password: 'PasswordQueNoSeGuarda1' });
    expectError(vencido, 400, 'TOKEN_INVALIDO');

    // La contraseña original sigue intacta
    await ctx.api
      .post('/auth/login')
      .send({ email: ctx.a.usuario.email, password: ctx.password })
      .expect(200);
  });

  it('Correo inexistente en POST /auth/olvide-contrasena responde 200 idéntico sin revelar si existe', async () => {
    const existente = await ctx.api
      .post('/auth/olvide-contrasena')
      .send({ email: ctx.a.usuario.email })
      .expect(200);

    const inexistente = await ctx.api
      .post('/auth/olvide-contrasena')
      .send({ email: 'no.existe.en.billo@example.com' })
      .expect(200);

    assert.deepEqual(inexistente.body, existente.body);
  });

  it('Límite de solicitudes por correo bloquea el exceso con 429 DEMASIADAS_SOLICITUDES sin afectar otros correos', async () => {
    for (let i = 0; i < MAX_SOLICITUDES_POR_CORREO; i++) {
      await ctx.api
        .post('/auth/olvide-contrasena')
        .send({ email: ctx.a.usuario.email })
        .expect(200);
    }

    const bloqueada = await ctx.api
      .post('/auth/olvide-contrasena')
      .send({ email: `  ${ctx.a.usuario.email.toUpperCase()} ` });
    expectError(bloqueada, 429, 'DEMASIADAS_SOLICITUDES');

    // Otro correo distinto sigue pudiendo solicitar recuperación
    await ctx.api
      .post('/auth/olvide-contrasena')
      .send({ email: ctx.b.usuario.email })
      .expect(200);
  });

  for (const [nombreCaso, body, codigoEsperado] of [
    ['token vacío', { token: '', password: 'NuevaPassword123' }, 'TOKEN_INVALIDO'],
    ['token incorrecto', { token: '000000', password: 'NuevaPassword123' }, 'TOKEN_INVALIDO'],
    ['contraseña corta', { token: '123456', password: 'corta' }, 'PASSWORD_MUY_CORTA'],
  ]) {
    it(`POST /auth/restablecer-contrasena rechaza ${nombreCaso} con 400 ${codigoEsperado}`, async () => {
      const res = await ctx.api.post('/auth/restablecer-contrasena').send(body);
      expectError(res, 400, codigoEsperado);
    });
  }

  for (const [nombreCaso, body] of [
    ['sin cuerpo', undefined],
    ['correo vacío', { email: '' }],
    ['formato inválido', { email: 'correo-sin-arroba' }],
  ]) {
    it(`POST /auth/olvide-contrasena rechaza ${nombreCaso} con 400 EMAIL_INVALIDO`, async () => {
      const req = ctx.api.post('/auth/olvide-contrasena');
      const res = await (body === undefined ? req : req.send(body));
      expectError(res, 400, 'EMAIL_INVALIDO');
    });
  }

  it('enviarCorreoRecuperacion llama a la API HTTP de Brevo con header api-key y remitente MAIL_FROM', async () => {
    const llamadas = [];
    const fetchMock = async (url, options) => {
      llamadas.push({ url, options });
      return {
        ok: true,
        status: 201,
        json: async () => ({ messageId: '<brevo-123@smtp-relay.mailin.fr>' }),
      };
    };

    await enviarCorreoRecuperacion({
      email: 'ana@example.com',
      nombre: 'Ana',
      token: '654321',
      fetchImpl: fetchMock,
      apiKey: 'xkeysib-test-key-123',
      mailFrom: 'Billo <equipo.billo@gmail.com>',
    });

    assert.equal(llamadas.length, 1);
    assert.equal(llamadas[0].url, BREVO_API_URL);
    assert.equal(llamadas[0].options.method, 'POST');
    assert.equal(llamadas[0].options.headers['api-key'], 'xkeysib-test-key-123');
    const payload = JSON.parse(llamadas[0].options.body);
    assert.deepEqual(payload.sender, {
      name: 'Billo',
      email: 'equipo.billo@gmail.com',
    });
    assert.deepEqual(payload.to, [{ email: 'ana@example.com', name: 'Ana' }]);
    assert.match(payload.textContent, /654321/);
  });

  describe('HU-68: Eliminar cuenta y todos los datos (DELETE /auth/cuenta)', () => {
    it('elimina cuenta, gastos, presupuestos y membresias con contraseña correcta', async () => {
      // 1. Crear datos asociados al usuario A
      await ctx.crearGasto(ctx.a, { monto: 150 });
      const catRes = await ctx.api.get('/categorias').auth(ctx.a.token, { type: 'bearer' });
      const catId = catRes.body[0].id;
      await ctx.api
        .post('/presupuestos')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ categoria_id: catId, monto_limite: 1000, mes: '2026-11' })
        .expect(201);
      await ctx.api
        .post('/membresias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ nombre: 'Gym', costo: 500, frecuencia: 'mensual', fecha_cobro: '2026-11-20' })
        .expect(201);

      // Crear también un gasto para el usuario B para validar que no se borre
      const gastoB = await ctx.crearGasto(ctx.b, { monto: 200 });

      // 2. Ejecutar DELETE /auth/cuenta con contraseña correcta
      const res = await ctx.api
        .delete('/auth/cuenta')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ password: ctx.password })
        .expect(200);

      assert.deepEqual(res.body, { eliminado: true });

      // 3. Verificar en la base de datos que no queda nada del usuario A
      const uRes = await ctx.pool.query('SELECT 1 FROM usuarios WHERE id = $1', [ctx.a.usuario.id]);
      assert.equal(uRes.rows.length, 0, 'El usuario debe eliminarse de la tabla usuarios');

      const gRes = await ctx.pool.query('SELECT 1 FROM gastos WHERE usuario_id = $1', [ctx.a.usuario.id]);
      assert.equal(gRes.rows.length, 0, 'No deben quedar gastos del usuario');

      const pRes = await ctx.pool.query('SELECT 1 FROM presupuestos WHERE usuario_id = $1', [ctx.a.usuario.id]);
      assert.equal(pRes.rows.length, 0, 'No deben quedar presupuestos del usuario');

      const mRes = await ctx.pool.query('SELECT 1 FROM membresias WHERE usuario_id = $1', [ctx.a.usuario.id]);
      assert.equal(mRes.rows.length, 0, 'No deben quedar membresias del usuario');

      // 4. Los datos del usuario B siguen intactos
      const gBRes = await ctx.pool.query('SELECT 1 FROM gastos WHERE id = $1', [gastoB.id]);
      assert.equal(gBRes.rows.length, 1, 'Los datos del usuario B no deben verse afectados');

      // 5. Ya no se puede iniciar sesión con la cuenta eliminada
      expectError(
        await ctx.api.post('/auth/login').send({ email: ctx.a.usuario.email, password: ctx.password }),
        401,
        'CREDENCIALES_INVALIDAS',
      );

      // 6. El mismo correo se puede registrar de nuevo inmediatamente
      const nuevoRegistro = await ctx.api
        .post('/auth/register')
        .send({ nombre: 'Nuevo Nombre', email: ctx.a.usuario.email, password: 'NuevaPassword123' })
        .expect(201);

      assert.equal(nuevoRegistro.body.usuario.email, ctx.a.usuario.email);
      assert.ok(nuevoRegistro.body.token);
    });

    it('contraseña incorrecta responde 401 PASSWORD_INCORRECTA y no borra nada', async () => {
      await ctx.crearGasto(ctx.a, { monto: 350 });

      const res = await ctx.api
        .delete('/auth/cuenta')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ password: 'PasswordTotalmenteErronea1' });

      expectError(res, 401, 'PASSWORD_INCORRECTA');

      // La cuenta y los datos siguen intactos
      const uRes = await ctx.pool.query('SELECT 1 FROM usuarios WHERE id = $1', [ctx.a.usuario.id]);
      assert.equal(uRes.rows.length, 1);

      const gRes = await ctx.pool.query('SELECT 1 FROM gastos WHERE usuario_id = $1', [ctx.a.usuario.id]);
      assert.equal(gRes.rows.length, 1);

      // El login sigue funcionando normalmente
      await ctx.api
        .post('/auth/login')
        .send({ email: ctx.a.usuario.email, password: ctx.password })
        .expect(200);
    });

    it('sin contraseña o cuerpo vacío responde 401 PASSWORD_INCORRECTA y no borra nada', async () => {
      const resVacio = await ctx.api
        .delete('/auth/cuenta')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({});

      expectError(resVacio, 401, 'PASSWORD_INCORRECTA');

      const resSinPassword = await ctx.api
        .delete('/auth/cuenta')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ password: '' });

      expectError(resSinPassword, 401, 'PASSWORD_INCORRECTA');

      const uRes = await ctx.pool.query('SELECT 1 FROM usuarios WHERE id = $1', [ctx.a.usuario.id]);
      assert.equal(uRes.rows.length, 1);
    });

    it('requiere autenticación con token válido', async () => {
      const resSinToken = await ctx.api.delete('/auth/cuenta').send({ password: ctx.password });
      expectError(resSinToken, 401, 'NO_AUTORIZADO');

      const resTokenInvalido = await ctx.api
        .delete('/auth/cuenta')
        .auth('token-invalido', { type: 'bearer' })
        .send({ password: ctx.password });
      expectError(resTokenInvalido, 401, 'NO_AUTORIZADO');
    });
  });

  describe('Editar perfil, cambiar contraseña y exportar datos CSV (feature/api-perfil-exportar)', () => {
    it('PUT /auth/perfil actualiza el nombre (1–100 caracteres), recorta espacios y persiste en GET /auth/perfil', async () => {
      const { body } = await ctx.api
        .put('/auth/perfil')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ nombre: '  Usuario A Editado  ' })
        .expect(200);

      assert.deepEqual(body, {
        usuario: {
          id: ctx.a.usuario.id,
          nombre: 'Usuario A Editado',
          email: ctx.a.usuario.email,
        },
      });

      const perfil = await ctx.api
        .get('/auth/perfil')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.equal(perfil.body.nombre, 'Usuario A Editado');

      // El usuario B sigue intacto
      const perfilB = await ctx.api
        .get('/auth/perfil')
        .auth(ctx.b.token, { type: 'bearer' })
        .expect(200);
      assert.equal(perfilB.body.nombre, ctx.b.usuario.nombre);
    });

    it('PUT /auth/perfil valida nombre entre 1 y 100 caracteres (400 NOMBRE_INVALIDO) y requiere token (401)', async () => {
      for (const invalido of ['', '   ', null, 123, 'a'.repeat(101)]) {
        expectError(
          await ctx.api
            .put('/auth/perfil')
            .auth(ctx.a.token, { type: 'bearer' })
            .send({ nombre: invalido }),
          400,
          'NOMBRE_INVALIDO'
        );
      }

      expectError(
        await ctx.api.put('/auth/perfil').send({ nombre: 'Valido' }),
        401,
        'NO_AUTORIZADO'
      );
    });

    it('POST /auth/cambiar-contrasena rechaza contraseña actual incorrecta o nueva inválida sin modificar la cuenta, y permite iniciar sesión con la nueva', async () => {
      // Contraseña actual incorrecta -> 400 CONTRASENA_ACTUAL_INCORRECTA
      expectError(
        await ctx.api
          .post('/auth/cambiar-contrasena')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({
            contrasena_actual: 'Incorrecta123',
            contrasena_nueva: 'NuevaSegura123',
          }),
        400,
        'CONTRASENA_ACTUAL_INCORRECTA'
      );

      expectError(
        await ctx.api
          .post('/auth/cambiar-contrasena')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({
            contrasena_actual: '',
            contrasena_nueva: 'NuevaSegura123',
          }),
        400,
        'CONTRASENA_ACTUAL_INCORRECTA'
      );

      // Contraseña nueva inválida (< 8 chars o no string) -> 400 CONTRASENA_INVALIDA
      for (const malaNueva of ['', '1234567', null, 12345678]) {
        expectError(
          await ctx.api
            .post('/auth/cambiar-contrasena')
            .auth(ctx.a.token, { type: 'bearer' })
            .send({
              contrasena_actual: ctx.password,
              contrasena_nueva: malaNueva,
            }),
          400,
          'CONTRASENA_INVALIDA'
        );
      }

      // La contraseña original sigue funcionando tras los intentos fallidos
      await ctx.api
        .post('/auth/login')
        .send({ email: ctx.a.usuario.email, password: ctx.password })
        .expect(200);

      // Cambio exitoso
      const nuevaPass = 'MiNuevaContrasena99';
      const { body } = await ctx.api
        .post('/auth/cambiar-contrasena')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          contrasena_actual: ctx.password,
          contrasena_nueva: nuevaPass,
        })
        .expect(200);
      assert.equal(body.actualizada, true);

      // La anterior ya no sirve y la nueva permite iniciar sesión
      expectError(
        await ctx.api
          .post('/auth/login')
          .send({ email: ctx.a.usuario.email, password: ctx.password }),
        401,
        'CREDENCIALES_INVALIDAS'
      );
      await ctx.api
        .post('/auth/login')
        .send({ email: ctx.a.usuario.email, password: nuevaPass })
        .expect(200);
    });

    it('GET /exportar mantiene el importe y la moneda originales en gastos y suscripciones', async () => {
      await ctx.crearGasto(ctx.a, {
        monto: 200,
        moneda: 'USD',
        monto_original: 10,
        tipo_cambio: 20,
        nota: 'Gasto en dolares',
      });
      await ctx.crearGasto(ctx.a, { monto: 85.5, nota: 'Gasto en pesos' });
      await ctx.api
        .post('/membresias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          nombre: 'Servicio en euros',
          costo: 440,
          moneda: 'EUR',
          monto_original: 20,
          tipo_cambio: 22,
          frecuencia: 'mensual',
          fecha_cobro: '2026-10-20',
        })
        .expect(201);

      for (const query of ['?formato=csv', '?formato=csv&mes=2026-10']) {
        const { text } = await ctx.api
          .get(`/exportar${query}`)
          .auth(ctx.a.token, { type: 'bearer' })
          .expect(200);
        assert.match(text, /gasto,2026-10-05,Gasto en dolares,Comida,10\.00,USD,efectivo/);
        assert.match(text, /gasto,2026-10-05,Gasto en pesos,Comida,85\.50,MXN,efectivo/);
        assert.match(text, /suscripcion,2026-10-20,Servicio en euros,mensual,20\.00,EUR,/);
        assert.doesNotMatch(text, /200\.00,USD|440\.00,EUR/);
      }

      // Registros antiguos sin importe original conservan su valor convertido en MXN.
      await ctx.pool.query('UPDATE gastos SET monto_original = NULL WHERE usuario_id = $1', [ctx.a.usuario.id]);
      await ctx.pool.query('UPDATE membresias SET monto_original = NULL WHERE usuario_id = $1', [ctx.a.usuario.id]);
      const { text } = await ctx.api
        .get('/exportar?formato=csv')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.match(text, /Gasto en dolares,Comida,200\.00,MXN,/);
      assert.match(text, /Servicio en euros,mensual,440\.00,MXN,/);
    });

    it('GET /exportar neutraliza formulas de Excel en las celdas de texto', async () => {
      const casos = [
        ['=1+1', "'=1+1"],
        ['+1+1', "'+1+1"],
        ['-1+1', "'-1+1"],
        ['@SUM(1)', "'@SUM(1)"],
        ['  =1+1', "'  =1+1"],
        ['\t=1+1', "'\t=1+1"],
        ['\r=1+1', `"'\r=1+1"`],
        ['\n=1+1', `"'\n=1+1"`],
        ['=IF(1=1,"si","no")', `"'=IF(1=1,""si"",""no"")"`],
        ['Cafe, "manana"\nsegunda linea', `"Cafe, ""manana""\nsegunda linea"`],
      ];
      for (const [nota] of casos) {
        await ctx.crearGasto(ctx.a, { nota });
      }
      await ctx.api
        .post('/ingresos')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ monto: 100, fecha: '2026-10-15', descripcion: '=2+2', fuente: '+Bono' })
        .expect(201);
      await ctx.api
        .post('/membresias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ nombre: '@Servicio', costo: 199, frecuencia: 'mensual', fecha_cobro: '2026-10-20' })
        .expect(201);

      const { text } = await ctx.api
        .get('/exportar?formato=csv')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      for (const [, celdaEsperada] of casos) {
        assert.ok(text.includes(`gasto,2026-10-05,${celdaEsperada},Comida,85.50,MXN,efectivo\r\n`));
      }
      assert.ok(text.includes("ingreso,2026-10-15,'=2+2,'+Bono,100.00,MXN,\r\n"));
      assert.ok(text.includes("suscripcion,2026-10-20,'@Servicio,mensual,199.00,MXN,\r\n"));
      const gastos = await ctx.listar(ctx.a);
      assert.ok(gastos.some(gasto => gasto.nota === '=1+1'), 'La proteccion del CSV no modifica los datos guardados');
    });

    it('GET /exportar genera CSV en UTF-8 con BOM solo con los datos del usuario (con y sin filtro de mes)', async () => {
      // Datos del usuario A en octubre y noviembre
      await ctx.crearGasto(ctx.a, {
        monto: 85.5,
        fecha: '2026-10-05',
        metodo_pago: 'efectivo',
        nota: 'Tacos, salsa y "refresco"',
      });
      await ctx.crearGasto(ctx.a, {
        monto: 200,
        fecha: '2026-11-10',
        metodo_pago: 'tarjeta',
        nota: 'Gasolina noviembre',
      });
      await ctx.api
        .post('/ingresos')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          monto: 15000,
          fecha: '2026-10-15',
          descripcion: 'Quincena octubre',
          fuente: 'Salario',
        })
        .expect(201);
      await ctx.api
        .post('/membresias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          nombre: 'Netflix',
          costo: 199,
          frecuencia: 'mensual',
          fecha_cobro: '2026-10-20',
        })
        .expect(201);

      // Datos del usuario B que NUNCA deben aparecer en el CSV de A
      await ctx.crearGasto(ctx.b, {
        monto: 999,
        fecha: '2026-10-05',
        nota: 'Secreto B',
      });
      await ctx.api
        .post('/ingresos')
        .auth(ctx.b.token, { type: 'bearer' })
        .send({
          monto: 88888,
          fecha: '2026-10-15',
          descripcion: 'Ingreso B',
          fuente: 'Bono B',
        })
        .expect(201);

      // 1) Exportar filtrado por mes=2026-10
      const resOct = await ctx.api
        .get('/exportar?formato=csv&mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.match(resOct.headers['content-type'], /text\/csv/);
      assert.match(resOct.headers['content-type'], /utf-8/i);
      assert.ok(
        resOct.text.startsWith('\uFEFF'),
        'El CSV debe iniciar con BOM UTF-8 (\\uFEFF) para abrir bien en Excel'
      );

      const lineasOct = resOct.text
        .slice(1)
        .trim()
        .split(/\r?\n/);
      assert.equal(
        lineasOct[0],
        'tipo,fecha,descripción,categoría/fuente,monto,moneda,método de pago'
      );
      assert.equal(lineasOct.length, 4); // encabezado + 1 gasto + 1 ingreso + 1 suscripción de oct
      assert.match(resOct.text, /"Tacos, salsa y ""refresco"""/);
      assert.match(resOct.text, /ingreso,2026-10-15,Quincena octubre,Salario,15000\.00,MXN,/);
      assert.match(resOct.text, /suscripcion,2026-10-20,Netflix,mensual,199\.00,MXN,/);
      assert.doesNotMatch(resOct.text, /Gasolina noviembre/);
      assert.doesNotMatch(resOct.text, /Secreto B/);
      assert.doesNotMatch(resOct.text, /Ingreso B/);

      // 2) Exportar sin mes incluye también noviembre de A, pero nada de B
      const resTodo = await ctx.api
        .get('/exportar?formato=csv')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.match(resTodo.text, /Gasolina noviembre/);
      assert.doesNotMatch(resTodo.text, /Secreto B/);

      // Validaciones de formato, mes y token
      expectError(
        await ctx.api
          .get('/exportar?formato=pdf')
          .auth(ctx.a.token, { type: 'bearer' }),
        400,
        'FORMATO_INVALIDO'
      );
      expectError(
        await ctx.api
          .get('/exportar?formato=csv&mes=2026-13')
          .auth(ctx.a.token, { type: 'bearer' }),
        400,
        'MES_INVALIDO'
      );
      expectError(await ctx.api.get('/exportar?formato=csv'), 401, 'NO_AUTORIZADO');
    });
  });
});
