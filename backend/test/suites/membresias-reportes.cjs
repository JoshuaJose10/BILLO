const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { expectError } = require('../helpers/fixtures.cjs');

module.exports = getContext => describe('QA membresías y reportes (RF5/RF6/RF8)', () => {
  let ctx;
  let categorias;
  const datos = (overrides = {}) => ({ nombre: 'Netflix', costo: 199,
    frecuencia: 'mensual', fecha_cobro: '2026-10-20', ...overrides });
  const get = async (route, user = ctx.a) => (await ctx.api.get(route)
    .auth(user.token, { type: 'bearer' }).expect(200)).body;
  const crear = async (body = datos(), user = ctx.a) => (await ctx.api.post('/membresias')
    .auth(user.token, { type: 'bearer' }).send(body).expect(201)).body.membresia;
  const resumen = (user = ctx.a, mes = '2026-10') => get(`/reportes/resumen?mes=${mes}`, user);
  const porCategoria = (user = ctx.a, mes = '2026-10') => get(`/reportes/por-categoria?mes=${mes}`, user);
  async function cargarGastos(user = ctx.a) {
    for (const [nombre, monto, fecha] of [
      ['Comida', 350, '2026-10-01'], ['Comida', 250, '2026-10-31'],
      ['Transporte', 300, '2026-10-15'], ['Entretenimiento', 100, '2026-10-20'],
      ['Comida', 777, '2026-09-30'], ['Comida', 888, '2026-11-01'],
    ]) await ctx.crearGasto(user, { monto, fecha, categoria_id: categorias[nombre] });
  }
  // Oráculo manual: 600 + 300 + 100 = 1000; 200 + 1200/12 = 300; total 1300.
  async function conciliar(user, variable, fijo, total) {
    const r = await resumen(user);
    const c = await porCategoria(user);
    const m = await get('/membresias', user);
    assert.deepEqual(r, { mes: '2026-10', gasto_variable: variable, gasto_fijo: fijo, total });
    assert.equal(Math.round(c.reduce((s, x) => s + x.total, 0) * 100), variable * 100);
    // Sumar antes de redondear: dos anuales de 100 aportan 16.67, no 16.66.
    assert.equal(Math.round(m.reduce((s, x) => s + (x.frecuencia === 'anual' ? x.costo / 12 : x.costo), 0) * 100), Math.round(fijo * 100));
    assert.equal(Math.round((r.gasto_variable + r.gasto_fijo) * 100), Math.round(total * 100));
    return { r, c, m };
  }
  beforeEach(async () => {
    ctx = getContext();
    await ctx.reset();
    categorias = Object.fromEntries((await get('/categorias')).map(c => [c.nombre, c.id]));
    for (const nombre of ['Comida', 'Transporte', 'Entretenimiento']) assert.ok(categorias[nombre]);
  });

  it('CP-RF5-01: crea y lista nombre, costo, frecuencia y fecha', async () => {
    const m = await crear();
    assert.deepEqual(m, { id: m.id, servicio_id: null, ...datos() });
    const lista = await get('/membresias');
    assert.equal(lista.length, 1);
    assert.deepEqual(lista[0], { ...m, dias_para_cobro: lista[0].dias_para_cobro });
    assert.equal(Number.isInteger(lista[0].dias_para_cobro), true);
  });
  it('CP-RF5-02: edita a 219, elimina y recalcula el resumen', async () => {
    const m = await crear();
    const editada = await ctx.api.put(`/membresias/${m.id}`).auth(ctx.a.token, { type: 'bearer' })
      .send(datos({ costo: 219 })).expect(200);
    assert.equal(editada.body.membresia.costo, 219);
    assert.equal((await get('/membresias'))[0].costo, 219);
    await conciliar(ctx.a, 0, 219, 219);
    const eliminada = await ctx.api.delete(`/membresias/${m.id}`).auth(ctx.a.token, { type: 'bearer' }).expect(200);
    assert.deepEqual(eliminada.body, { eliminado: true });
    assert.deepEqual(await get('/membresias'), []);
    await conciliar(ctx.a, 0, 0, 0);
  });
  for (const [id, patch, code] of [
    ['CP-RF5-03', { nombre: '' }, 'NOMBRE_INVALIDO'],
    ['CP-RF5-04', { costo: 'abc' }, 'COSTO_INVALIDO'],
    ['RF5-COSTO-CERO', { costo: 0 }, 'COSTO_INVALIDO'],
    ['RF5-FRECUENCIA', { frecuencia: 'semanal' }, 'FRECUENCIA_INVALIDA'],
    ['RF5-FECHA', { fecha_cobro: '2026-02-30' }, 'FECHA_INVALIDA'],
    ['RF5-SERVICIO', { servicio_id: 2147483647 }, 'SERVICIO_INEXISTENTE'],
  ]) it(`${id}: rechaza datos inválidos sin persistir`, async () => {
    expectError(await ctx.api.post('/membresias').auth(ctx.a.token, { type: 'bearer' }).send(datos(patch)), 400, code);
    assert.deepEqual(await get('/membresias'), []);
    await conciliar(ctx.a, 0, 0, 0);
  });
  it('RF5-CATALOGO: hereda nombre y costo; permite costo personalizado sin cambiar catálogo', async () => {
    const catalogo = await get('/catalogo');
    const netflix = catalogo.find(s => s.nombre === 'Netflix');
    assert.equal(netflix.costo_sugerido, 199);
    const base = { servicio_id: netflix.id, frecuencia: 'mensual', fecha_cobro: '2026-10-20' };
    const m = await crear(base);
    assert.deepEqual(m, { id: m.id, ...datos(), servicio_id: netflix.id });
    await conciliar(ctx.a, 0, 199, 199);
    await ctx.api.put(`/membresias/${m.id}`).auth(ctx.a.token, { type: 'bearer' })
      .send({ ...base, costo: 219 }).expect(200);
    await conciliar(ctx.a, 0, 219, 219);
    assert.deepEqual(await get('/catalogo'), catalogo);
  });
  it('HU-63: catálogo ampliado con planes y precios de México (RF5/RF9)', async () => {
    const catalogo = await get('/catalogo');
    assert.ok(catalogo.length >= 25, `El catálogo debe tener al menos 25 servicios, tiene ${catalogo.length}`);

    // Verificar servicios y planes clave de México
    const serviciosEsperados = [
      'Spotify Individual',
      'Spotify Duo',
      'Spotify Familiar',
      'Netflix Estándar',
      'Netflix Premium',
      'Paramount+ Estándar',
      'Crunchyroll Fan',
      'Microsoft 365 Personal',
      'Amazon Prime',
    ];

    for (const nombre of serviciosEsperados) {
      const item = catalogo.find((s) => s.nombre === nombre);
      assert.ok(item, `El plan '${nombre}' debe existir en el catálogo`);
      assert.ok(typeof item.costo_sugerido === 'number' && item.costo_sugerido > 0);
      assert.ok(typeof item.logo_url === 'string' && item.logo_url.startsWith('https://'));
    }

    // Crear membresía desde el catálogo heredando nombre y costo del plan
    const spotifyDuo = catalogo.find((s) => s.nombre === 'Spotify Duo');
    const membresiaDuo = await crear({
      servicio_id: spotifyDuo.id,
      frecuencia: 'mensual',
      fecha_cobro: '2026-11-20',
    });
    assert.equal(membresiaDuo.nombre, 'Spotify Duo');
    assert.equal(membresiaDuo.costo, spotifyDuo.costo_sugerido);
  });
  it('CP-RF6-01: variable 500 + fijo 300 = total 800', async () => {
    await ctx.crearGasto(ctx.a, { monto: 350 });
    await ctx.crearGasto(ctx.a, { monto: 150 });
    await crear(datos({ costo: 300 }));
    await conciliar(ctx.a, 500, 300, 800);
  });
  it('CP-RF6-02 / CP-RF8-02: sin datos devuelve ceros y arreglos vacíos', async () => {
    const { c, m } = await conciliar(ctx.a, 0, 0, 0);
    assert.deepEqual(c, []);
    assert.deepEqual(m, []);
  });
  it('CP-RF8-01: categorías 600/300/100 con proporciones 60/30/10', async () => {
    await cargarGastos();
    const { c } = await conciliar(ctx.a, 1000, 0, 1000);
    assert.deepEqual(c, [
      { categoria_id: categorias.Comida, categoria: 'Comida', total: 600, porcentaje: 60 },
      { categoria_id: categorias.Transporte, categoria: 'Transporte', total: 300, porcentaje: 30 },
      { categoria_id: categorias.Entretenimiento, categoria: 'Entretenimiento', total: 100, porcentaje: 10 },
    ]);
  });
  it('CONSISTENCIA-ANUAL: tres endpoints concilian 1000 + (200 + 1200/12) = 1300', async () => {
    await cargarGastos();
    await crear(datos({ nombre: 'Gimnasio', costo: 200 }));
    await crear(datos({ nombre: 'Anual', costo: 1200, frecuencia: 'anual', fecha_cobro: '2027-01-01' }));
    const { c, m } = await conciliar(ctx.a, 1000, 300, 1300);
    assert.equal(m.length, 2);
    assert.equal(c.reduce((s, x) => s + x.porcentaje, 0), 100);
    assert.equal((await resumen(ctx.a, '2026-09')).gasto_variable, 777);
    assert.equal((await resumen(ctx.a, '2026-11')).gasto_variable, 888);
  });
  it('CONSISTENCIA-DECIMALES: 0.10 + 0.20 y dos anuales de 100 redondeados al final', async () => {
    await ctx.crearGasto(ctx.a, { monto: 0.1 });
    await ctx.crearGasto(ctx.a, { monto: 0.2, categoria_id: ctx.otraCategoria });
    await crear(datos({ costo: 100, frecuencia: 'anual' }));
    await crear(datos({ costo: 100, frecuencia: 'anual' }));
    await conciliar(ctx.a, 0.3, 16.67, 16.97);
  });
  it('RF8-REDONDEO: tres categorías iguales suman 100 % con orden estable', async () => {
    const ids = Object.values(categorias).slice(0, 3).sort((a, b) => a - b);
    for (const categoria_id of ids) await ctx.crearGasto(ctx.a, { monto: 1, categoria_id });
    const c = await porCategoria();
    assert.deepEqual(c.map(x => x.categoria_id), ids);
    assert.deepEqual(c.map(x => x.porcentaje), [34, 33, 33]);
    await conciliar(ctx.a, 3, 0, 3);
  });
  it('CONSISTENCIA-CAMBIOS: editar y borrar gastos/membresías actualiza ambos reportes', async () => {
    const g = await ctx.crearGasto(ctx.a, { monto: 100 });
    const m = await crear(datos({ costo: 1200, frecuencia: 'anual' }));
    await conciliar(ctx.a, 100, 100, 200);
    await ctx.api.put(`/gastos/${g.id}`).auth(ctx.a.token, { type: 'bearer' })
      .send(ctx.gasto({ monto: 250, categoria_id: ctx.otraCategoria })).expect(200);
    await ctx.api.put(`/membresias/${m.id}`).auth(ctx.a.token, { type: 'bearer' })
      .send(datos({ costo: 2400, frecuencia: 'anual' })).expect(200);
    await conciliar(ctx.a, 250, 200, 450);
    await ctx.api.delete(`/gastos/${g.id}`).auth(ctx.a.token, { type: 'bearer' }).expect(200);
    await ctx.api.delete(`/membresias/${m.id}`).auth(ctx.a.token, { type: 'bearer' }).expect(200);
    await conciliar(ctx.a, 0, 0, 0);
  });
  it('AISLAMIENTO-AB: listas y reportes propios; catálogo compartido sin datos personales', async () => {
    await cargarGastos();
    await crear(datos({ costo: 1200, frecuencia: 'anual' }));
    await ctx.crearGasto(ctx.b, { monto: 999 });
    await crear(datos({ nombre: 'Privada B', costo: 750 }), ctx.b);
    const a = await conciliar(ctx.a, 1000, 100, 1100);
    const b = await conciliar(ctx.b, 999, 750, 1749);
    assert.equal(a.m.length, 1);
    assert.equal(b.m.length, 1);
    assert.notEqual(a.m[0].id, b.m[0].id);
    for (const [route, expected] of [
      ['/membresias', a.m], ['/reportes/resumen?mes=2026-10', a.r],
      ['/reportes/por-categoria?mes=2026-10', a.c],
    ]) assert.deepEqual(await get(`${route}${route.includes('?') ? '&' : '?'}usuario_id=${ctx.b.usuario.id}`), expected);
    assert.deepEqual(await get('/catalogo', ctx.a), await get('/catalogo', ctx.b));
    assert.equal((await get('/catalogo')).some(s => s.nombre === 'Privada B'), false);
  });
  for (const method of ['put', 'delete']) it(`AISLAMIENTO-${method.toUpperCase()}: no modifica membresía ajena ni totales`, async () => {
    const m = await crear(datos({ costo: 1200, frecuencia: 'anual' }));
    const request = ctx.api[method](`/membresias/${m.id}`).auth(ctx.b.token, { type: 'bearer' });
    if (method === 'put') request.send(datos({ costo: 1 }));
    expectError(await request, 404, 'MEMBRESIA_NO_ENCONTRADA');
    assert.equal((await get('/membresias'))[0].costo, 1200);
    await conciliar(ctx.a, 0, 100, 100);
    await conciliar(ctx.b, 0, 0, 0);
  });
  for (const [method, route, body] of [
    ['get', '/catalogo'], ['get', '/membresias'], ['post', '/membresias', datos()],
    ['put', '/membresias/1', datos()], ['delete', '/membresias/1'],
    ['get', '/reportes/resumen?mes=2026-10'], ['get', '/reportes/por-categoria?mes=2026-10'],
  ]) for (const token of [null, 'token-invalido']) it(`AUTH-${method.toUpperCase()} ${route}: ${token ? 'token inválido' : 'sin token'}`, async () => {
    const m = await crear();
    const request = ctx.api[method](route);
    if (token) request.auth(token, { type: 'bearer' });
    if (body) request.send(body);
    expectError(await request, 401, 'NO_AUTORIZADO');
    const lista = await get('/membresias');
    assert.equal(lista.length, 1);
    assert.deepEqual(lista[0], { ...m, dias_para_cobro: lista[0].dias_para_cobro });
    await conciliar(ctx.a, 0, 199, 199);
  });
  for (const route of ['/reportes/resumen', '/reportes/por-categoria']) {
    for (const mes of [null, '', '2026-13', '2026-1', '2026-10-01']) it(`MES-INVALIDO ${route}: ${JSON.stringify(mes)}`, async () => {
      expectError(await ctx.api.get(route).query(mes === null ? {} : { mes })
        .auth(ctx.a.token, { type: 'bearer' }), 400, 'MES_INVALIDO');
    });
  }

  describe('Administración del catálogo (RF9)', () => {
    async function obtenerTokenAdmin() {
      const jwt = require('jsonwebtoken');
      const { rows } = await ctx.pool.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol)
         VALUES ('Admin Catálogo', 'admin.catalogo@example.com', 'hash_fake', 'admin')
         ON CONFLICT (email) DO UPDATE SET rol = 'admin'
         RETURNING id, rol`
      );
      return jwt.sign(
        { id: rows[0].id, rol: rows[0].rol },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    for (const [method, route, body] of [
      ['post', '/catalogo', { nombre: 'Servicio Test', costo_sugerido: 99 }],
      ['put', '/catalogo/1', { nombre: 'Servicio Test', costo_sugerido: 99 }],
      ['delete', '/catalogo/1'],
    ]) {
      for (const token of [null, 'token-invalido']) {
        it(`AUTH-ADMIN ${method.toUpperCase()} ${route}: ${token ? 'token inválido' : 'sin token'} responde 401 NO_AUTORIZADO`, async () => {
          const req = ctx.api[method](route);
          if (token) req.auth(token, { type: 'bearer' });
          if (body) req.send(body);
          expectError(await req, 401, 'NO_AUTORIZADO');
        });
      }
    }

    it('usuario normal recibe 403 PROHIBIDO en POST, PUT y DELETE /catalogo y GET /catalogo sigue abierto', async () => {
      const catalogoAntes = await get('/catalogo', ctx.a);
      assert.ok(catalogoAntes.length > 0);

      const postReq = await ctx.api
        .post('/catalogo')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ nombre: 'Servicio Test', costo_sugerido: 99 });
      expectError(postReq, 403, 'PROHIBIDO');

      const putReq = await ctx.api
        .put(`/catalogo/${catalogoAntes[0].id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ nombre: 'Servicio Mod', costo_sugerido: 100 });
      expectError(putReq, 403, 'PROHIBIDO');

      const delReq = await ctx.api
        .delete(`/catalogo/${catalogoAntes[0].id}`)
        .auth(ctx.a.token, { type: 'bearer' });
      expectError(delReq, 403, 'PROHIBIDO');

      const catalogoDespues = await get('/catalogo', ctx.b);
      assert.deepEqual(catalogoDespues, catalogoAntes);
    });

    it('admin agrega un nuevo servicio al catálogo (201) con y sin logo_url', async () => {
      const tokenAdmin = await obtenerTokenAdmin();
      const res = await ctx.api
        .post('/catalogo')
        .auth(tokenAdmin, { type: 'bearer' })
        .send({
          nombre: '  Servicio Prueba $99  ',
          costo_sugerido: 99.5,
          logo_url: '  https://example.com/logo.png  ',
        })
        .expect(201);

      assert.ok(res.body.servicio.id);
      assert.equal(res.body.servicio.nombre, 'Servicio Prueba $99');
      assert.equal(res.body.servicio.costo_sugerido, 99.5);
      assert.equal(res.body.servicio.logo_url, 'https://example.com/logo.png');

      const resSinLogo = await ctx.api
        .post('/catalogo')
        .auth(tokenAdmin, { type: 'bearer' })
        .send({ nombre: 'Servicio Sin Logo', costo_sugerido: 49 })
        .expect(201);
      assert.equal(resSinLogo.body.servicio.logo_url, null);

      const catalogo = await get('/catalogo');
      const encontrado = catalogo.find(
        (s) => s.id === res.body.servicio.id
      );
      assert.deepEqual(encontrado, res.body.servicio);

      // Limpiar servicios creados para no afectar otras pruebas
      await ctx.pool.query('DELETE FROM catalogo_servicios WHERE id = ANY($1)', [
        [res.body.servicio.id, resSinLogo.body.servicio.id],
      ]);
    });

    it('admin valida nombre, costo sugerido y logo en POST y PUT /catalogo (400)', async () => {
      const tokenAdmin = await obtenerTokenAdmin();
      const creado = (
        await ctx.api
          .post('/catalogo')
          .auth(tokenAdmin, { type: 'bearer' })
          .send({ nombre: 'Servicio Base Validacion', costo_sugerido: 50 })
          .expect(201)
      ).body.servicio;

      const casosInvalidos = [
        ['sin cuerpo', undefined, 'NOMBRE_INVALIDO'],
        ['nombre vacío', { nombre: '   ', costo_sugerido: 50 }, 'NOMBRE_INVALIDO'],
        ['nombre no string', { nombre: 123, costo_sugerido: 50 }, 'NOMBRE_INVALIDO'],
        [
          'nombre mayor a 255 caracteres',
          { nombre: 'a'.repeat(256), costo_sugerido: 50 },
          'NOMBRE_INVALIDO',
        ],
        [
          'nombre duplicado en catálogo',
          { nombre: 'netflix', costo_sugerido: 50 },
          'NOMBRE_INVALIDO',
        ],
        ['costo ausente', { nombre: 'Servicio Valido' }, 'COSTO_INVALIDO'],
        [
          'costo negativo',
          { nombre: 'Servicio Valido', costo_sugerido: -10 },
          'COSTO_INVALIDO',
        ],
        [
          'costo cero',
          { nombre: 'Servicio Valido', costo_sugerido: 0 },
          'COSTO_INVALIDO',
        ],
        [
          'costo como string',
          { nombre: 'Servicio Valido', costo_sugerido: '50' },
          'COSTO_INVALIDO',
        ],
        [
          'costo con más de 2 decimales',
          { nombre: 'Servicio Valido', costo_sugerido: 50.123 },
          'COSTO_INVALIDO',
        ],
        [
          'logo no string',
          { nombre: 'Servicio Valido', costo_sugerido: 50, logo_url: 123 },
          'LOGO_INVALIDO',
        ],
        [
          'logo sin protocolo http/https',
          {
            nombre: 'Servicio Valido',
            costo_sugerido: 50,
            logo_url: 'ftp://example.com/logo.png',
          },
          'LOGO_INVALIDO',
        ],
        [
          'logo inválido',
          {
            nombre: 'Servicio Valido',
            costo_sugerido: 50,
            logo_url: 'no-es-una-url',
          },
          'LOGO_INVALIDO',
        ],
        [
          'logo mayor a 500 caracteres',
          {
            nombre: 'Servicio Valido',
            costo_sugerido: 50,
            logo_url: `https://example.com/${'a'.repeat(490)}`,
          },
          'LOGO_INVALIDO',
        ],
      ];

      for (const [, payload, expectedCode] of casosInvalidos) {
        const postReq = ctx.api
          .post('/catalogo')
          .auth(tokenAdmin, { type: 'bearer' });
        expectError(
          await (payload === undefined ? postReq : postReq.send(payload)),
          400,
          expectedCode
        );

        const putReq = ctx.api
          .put(`/catalogo/${creado.id}`)
          .auth(tokenAdmin, { type: 'bearer' });
        expectError(
          await (payload === undefined ? putReq : putReq.send(payload)),
          400,
          expectedCode
        );
      }

      await ctx.pool.query('DELETE FROM catalogo_servicios WHERE id = $1', [
        creado.id,
      ]);
    });

    it('admin edita un servicio existente (200) y responde 404 si no existe', async () => {
      const tokenAdmin = await obtenerTokenAdmin();
      const creado = (
        await ctx.api
          .post('/catalogo')
          .auth(tokenAdmin, { type: 'bearer' })
          .send({ nombre: 'Servicio Editable', costo_sugerido: 50 })
          .expect(201)
      ).body.servicio;

      const editado = (
        await ctx.api
          .put(`/catalogo/${creado.id}`)
          .auth(tokenAdmin, { type: 'bearer' })
          .send({
            nombre: 'Servicio Editable Actualizado',
            costo_sugerido: 75.5,
            logo_url: 'https://example.com/nuevo.png',
          })
          .expect(200)
      ).body.servicio;

      assert.equal(editado.id, creado.id);
      assert.equal(editado.nombre, 'Servicio Editable Actualizado');
      assert.equal(editado.costo_sugerido, 75.5);
      assert.equal(editado.logo_url, 'https://example.com/nuevo.png');

      const catalogo = await get('/catalogo');
      const item = catalogo.find((s) => s.id === creado.id);
      assert.deepEqual(item, editado);

      for (const idInexistente of ['999999', '0', '-5', 'abc']) {
        expectError(
          await ctx.api
            .put(`/catalogo/${idInexistente}`)
            .auth(tokenAdmin, { type: 'bearer' })
            .send({ nombre: 'No Existe', costo_sugerido: 100 }),
          404,
          'SERVICIO_NO_ENCONTRADO'
        );
      }

      await ctx.pool.query('DELETE FROM catalogo_servicios WHERE id = $1', [
        creado.id,
      ]);
    });

    it('eliminar un servicio en uso por membresías responde 409 SERVICIO_EN_USO y no lo borra', async () => {
      const tokenAdmin = await obtenerTokenAdmin();
      const catalogo = await get('/catalogo');
      const netflix = catalogo.find((s) => s.nombre === 'Netflix');
      assert.ok(netflix);

      await crear({
        servicio_id: netflix.id,
        frecuencia: 'mensual',
        fecha_cobro: '2026-11-20',
      });

      const delRes = await ctx.api
        .delete(`/catalogo/${netflix.id}`)
        .auth(tokenAdmin, { type: 'bearer' });
      expectError(delRes, 409, 'SERVICIO_EN_USO');

      const catalogoDespues = await get('/catalogo');
      assert.ok(catalogoDespues.some((s) => s.id === netflix.id));
    });

    it('admin elimina un servicio que no está en uso (200) y responde 404 si ya no existe', async () => {
      const tokenAdmin = await obtenerTokenAdmin();
      const nuevo = (
        await ctx.api
          .post('/catalogo')
          .auth(tokenAdmin, { type: 'bearer' })
          .send({ nombre: 'Servicio Desechable', costo_sugerido: 10 })
          .expect(201)
      ).body.servicio;

      const delRes = await ctx.api
        .delete(`/catalogo/${nuevo.id}`)
        .auth(tokenAdmin, { type: 'bearer' })
        .expect(200);
      assert.deepEqual(delRes.body, { eliminado: true });

      const catalogo = await get('/catalogo');
      assert.ok(!catalogo.some((s) => s.id === nuevo.id));

      // Intentar eliminarlo de nuevo o un ID inválido -> 404 SERVICIO_NO_ENCONTRADO
      expectError(
        await ctx.api
          .delete(`/catalogo/${nuevo.id}`)
          .auth(tokenAdmin, { type: 'bearer' }),
        404,
        'SERVICIO_NO_ENCONTRADO'
      );
      expectError(
        await ctx.api
          .delete('/catalogo/invalid-id')
          .auth(tokenAdmin, { type: 'bearer' }),
        404,
        'SERVICIO_NO_ENCONTRADO'
      );
    });
  });
});
