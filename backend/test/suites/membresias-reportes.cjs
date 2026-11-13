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
    assert.deepEqual(m, {
      id: m.id,
      servicio_id: null,
      ...datos(),
      moneda: 'MXN',
      monto_original: null,
      tipo_cambio: null,
      estado: 'activa',
    });
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
    assert.deepEqual(m, {
      id: m.id,
      ...datos(),
      servicio_id: netflix.id,
      moneda: 'MXN',
      monto_original: null,
      tipo_cambio: null,
      estado: 'activa',
    });
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

  describe('HU-66: marcar membresía como pagada (POST /membresias/:id/pagada)', () => {
    it('mensual del 15 pasa al 15 del mes siguiente', async () => {
      const m = await crear(datos({ fecha_cobro: '2026-10-15', frecuencia: 'mensual' }));
      const res = await ctx.api
        .post(`/membresias/${m.id}/pagada`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.equal(res.body.membresia.id, m.id);
      assert.equal(res.body.membresia.fecha_cobro, '2026-11-15');
      assert.equal(typeof res.body.membresia.dias_para_cobro, 'number');

      const lista = await get('/membresias');
      assert.equal(lista[0].fecha_cobro, '2026-11-15');
    });

    it('anual avanza un año exacto', async () => {
      const m = await crear(datos({ fecha_cobro: '2026-05-10', frecuencia: 'anual', costo: 1200 }));
      const res = await ctx.api
        .post(`/membresias/${m.id}/pagada`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.equal(res.body.membresia.fecha_cobro, '2027-05-10');
      assert.equal(res.body.membresia.frecuencia, 'anual');
    });

    it('fin de mes: 31 de enero pasa a 28 de febrero sin romperse', async () => {
      const m = await crear(datos({ fecha_cobro: '2026-01-31', frecuencia: 'mensual' }));
      const res = await ctx.api
        .post(`/membresias/${m.id}/pagada`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.equal(res.body.membresia.fecha_cobro, '2026-02-28');
    });

    it('fin de mes: 31 de marzo pasa a 30 de abril', async () => {
      const m = await crear(datos({ fecha_cobro: '2026-03-31', frecuencia: 'mensual' }));
      const res = await ctx.api
        .post(`/membresias/${m.id}/pagada`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.equal(res.body.membresia.fecha_cobro, '2026-04-30');
    });

    it('NO crea ningún gasto en la tabla gastos y el total mensual en reportes no se duplica', async () => {
      const m = await crear(datos({ costo: 300, frecuencia: 'mensual', fecha_cobro: '2026-10-15' }));
      const gastosAntes = await ctx.pool.query('SELECT COUNT(*) AS total FROM gastos WHERE usuario_id = $1', [ctx.a.usuario.id]);
      const totalGastosAntes = Number(gastosAntes.rows[0].total);

      await ctx.api
        .post(`/membresias/${m.id}/pagada`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      const gastosDespues = await ctx.pool.query('SELECT COUNT(*) AS total FROM gastos WHERE usuario_id = $1', [ctx.a.usuario.id]);
      const totalGastosDespues = Number(gastosDespues.rows[0].total);
      assert.equal(totalGastosDespues, totalGastosAntes);

      // Reportes concilia exactamente el gasto fijo sin gasto variable extra
      await conciliar(ctx.a, 0, 300, 300);
    });

    it('aislamiento A/B: otro usuario no puede marcar una membresía ajena (404)', async () => {
      const m = await crear(datos(), ctx.a);
      const resAjeno = await ctx.api
        .post(`/membresias/${m.id}/pagada`)
        .auth(ctx.b.token, { type: 'bearer' });

      expectError(resAjeno, 404, 'MEMBRESIA_NO_ENCONTRADA');

      // La fecha del usuario A sigue intacta
      const listaA = await get('/membresias', ctx.a);
      assert.equal(listaA[0].fecha_cobro, '2026-10-20');
    });

    it('responde 404 para ID inexistente o inválido', async () => {
      for (const idInvalido of ['999999', '0', '-1', 'abc']) {
        const res = await ctx.api
          .post(`/membresias/${idInvalido}/pagada`)
          .auth(ctx.a.token, { type: 'bearer' });
        expectError(res, 404, 'MEMBRESIA_NO_ENCONTRADA');
      }
    });
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

  describe('Moneda propia por suscripción (RF11 / HU-77)', () => {
    it('crea una suscripción de 10 USD con tipo de cambio y suma su equivalente en MXN a Reportes (Aceptación HU-77)', async () => {
      // 10 USD × 18.6311 = 186.31 MXN
      const res = await ctx.api
        .post('/membresias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          nombre: 'ChatGPT Plus',
          costo: 186.31,
          moneda: 'USD',
          monto_original: 10,
          tipo_cambio: 18.6311,
          frecuencia: 'mensual',
          fecha_cobro: '2026-10-15',
        })
        .expect(201);

      assert.deepEqual(res.body.membresia, {
        id: res.body.membresia.id,
        servicio_id: null,
        nombre: 'ChatGPT Plus',
        costo: 186.31,
        moneda: 'USD',
        monto_original: 10,
        tipo_cambio: 18.6311,
        frecuencia: 'mensual',
        fecha_cobro: '2026-10-15',
        estado: 'activa',
      });

      // El total mensual y Reportes suman el equivalente en MXN (186.31)
      const rep = await resumen(ctx.a, '2026-10');
      assert.equal(rep.gasto_fijo, 186.31);
      assert.equal(rep.total, 186.31);
    });

    it('cambiar una suscripción extranjera a MXN limpia monto_original y tipo_cambio (QA HU-77)', async () => {
      const creacion = await ctx.api
        .post('/membresias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          nombre: 'GitHub Copilot',
          costo: 186.31,
          moneda: 'USD',
          monto_original: 10,
          tipo_cambio: 18.6311,
          frecuencia: 'mensual',
          fecha_cobro: '2026-10-15',
        })
        .expect(201);

      const id = creacion.body.membresia.id;

      // Actualizar a MXN sin conversión
      const edicion = await ctx.api
        .put(`/membresias/${id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          nombre: 'GitHub Copilot',
          costo: 199,
          moneda: 'MXN',
          frecuencia: 'mensual',
          fecha_cobro: '2026-10-15',
        })
        .expect(200);

      assert.equal(edicion.body.membresia.moneda, 'MXN');
      assert.equal(edicion.body.membresia.costo, 199);
      assert.equal(edicion.body.membresia.monto_original, null);
      assert.equal(edicion.body.membresia.tipo_cambio, null);

      const rep = await resumen(ctx.a, '2026-10');
      assert.equal(rep.gasto_fijo, 199);
    });

    it('rechaza moneda inválida y conversión que no coincide con costo', async () => {
      // Código de moneda desconocido
      expectError(
        await ctx.api
          .post('/membresias')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({
            nombre: 'Sub Invalida',
            costo: 100,
            moneda: 'XYZ',
            monto_original: 5,
            tipo_cambio: 20,
            frecuencia: 'mensual',
            fecha_cobro: '2026-10-15',
          }),
        400,
        'MONEDA_INVALIDA'
      );

      // Desfase en la conversión: 10 * 18.6311 != 250
      expectError(
        await ctx.api
          .post('/membresias')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({
            nombre: 'Sub Desfasada',
            costo: 250,
            moneda: 'USD',
            monto_original: 10,
            tipo_cambio: 18.6311,
            frecuencia: 'mensual',
            fecha_cobro: '2026-10-15',
          }),
        400,
        'MONTO_INVALIDO'
      );
    });
  });

  describe('Pausar y reactivar suscripción (HU-75)', () => {
    it('pausar Netflix ($199) baja Reportes en $199 y reactivar lo devuelve (QA HU-75)', async () => {
      // 1. Crear Netflix ($199 mensual) y Spotify ($129 mensual)
      const netflix = await crear({ nombre: 'Netflix', costo: 199, frecuencia: 'mensual', fecha_cobro: '2026-10-20' });
      await crear({ nombre: 'Spotify', costo: 129, frecuencia: 'mensual', fecha_cobro: '2026-10-25' });

      // Ambas activas: gasto_fijo = 199 + 129 = 328
      let res = await resumen(ctx.a, '2026-10');
      assert.equal(res.gasto_fijo, 328);

      // 2. Pausar Netflix
      const pausarRes = await ctx.api
        .post(`/membresias/${netflix.id}/pausar`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.equal(pausarRes.body.membresia.estado, 'pausada');

      // Verificar en listado que Netflix está pausada pero se conserva
      const listaPausada = await get('/membresias');
      assert.equal(listaPausada.length, 2);
      const netflixEnLista = listaPausada.find((m) => m.id === netflix.id);
      assert.equal(netflixEnLista.estado, 'pausada');

      // En Reportes el gasto fijo baja $199 (solo queda Spotify: 129)
      res = await resumen(ctx.a, '2026-10');
      assert.equal(res.gasto_fijo, 129);

      // 3. Reactivar Netflix
      const reactivarRes = await ctx.api
        .post(`/membresias/${netflix.id}/reactivar`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.equal(reactivarRes.body.membresia.estado, 'activa');

      // En Reportes el gasto fijo vuelve a $328
      res = await resumen(ctx.a, '2026-10');
      assert.equal(res.gasto_fijo, 328);
    });

    it('PUT /membresias/:id permite actualizar el estado y rechaza estado inválido', async () => {
      const m = await crear();
      // Actualizar a pausada
      const editada = await ctx.api
        .put(`/membresias/${m.id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .send(datos({ estado: 'pausada' }))
        .expect(200);
      assert.equal(editada.body.membresia.estado, 'pausada');

      // Rechazar estado inválido
      expectError(
        await ctx.api
          .put(`/membresias/${m.id}`)
          .auth(ctx.a.token, { type: 'bearer' })
          .send(datos({ estado: 'cancelada' })),
        400,
        'ESTADO_INVALIDO'
      );
    });

    it('POST /membresias/:id/pausar y reactivar devuelven 404 para membresía inexistente o ajena', async () => {
      expectError(
        await ctx.api.post('/membresias/999999/pausar').auth(ctx.a.token, { type: 'bearer' }),
        404,
        'MEMBRESIA_NO_ENCONTRADA'
      );
      expectError(
        await ctx.api.post('/membresias/999999/reactivar').auth(ctx.a.token, { type: 'bearer' }),
        404,
        'MEMBRESIA_NO_ENCONTRADA'
      );

      // Membresía de usuario A intentada pausar por usuario B
      const m = await crear();
      expectError(
        await ctx.api.post(`/membresias/${m.id}/pausar`).auth(ctx.b.token, { type: 'bearer' }),
        404,
        'MEMBRESIA_NO_ENCONTRADA'
      );
    });
  });

  describe('Historial de pagos de una suscripción (pagos_membresia / Migración 019)', () => {
    it('Migración 019: crea la tabla pagos_membresia con ON DELETE CASCADE y es idempotente en base existente', async () => {
      const fs = require('node:fs');
      const path = require('node:path');

      const { rows: cols } = await ctx.pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'pagos_membresia'
        ORDER BY column_name
      `);
      assert.deepEqual(
        cols.map((c) => c.column_name),
        ['fecha', 'id', 'membresia_id', 'monto']
      );

      const { rows: fk } = await ctx.pool.query(`
        SELECT rc.delete_rule
        FROM information_schema.referential_constraints rc
        INNER JOIN information_schema.table_constraints tc
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'pagos_membresia'
          AND tc.constraint_type = 'FOREIGN KEY'
      `);
      assert.equal(fk[0]?.delete_rule, 'CASCADE');

      // Reaplicar la migración sobre una base existente que ya tiene un pago no falla ni pierde datos
      const m = await crear(datos({ costo: 199, fecha_cobro: '2026-10-15' }));
      await ctx.api
        .post(`/membresias/${m.id}/pagada`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      const sql = fs.readFileSync(
        path.resolve(__dirname, '../../migrations/019_pagos_membresia.sql'),
        'utf8'
      );
      await ctx.pool.query(sql);

      const historial = await get(`/membresias/${m.id}/pagos`);
      assert.equal(historial.length, 1);
      assert.equal(historial[0].monto, 199);
    });

    it('tres pagos se ven en orden con fecha y monto y NO crean ningún gasto', async () => {
      const m = await crear(datos({ nombre: 'Netflix', costo: 199, frecuencia: 'mensual', fecha_cobro: '2026-10-15' }));
      assert.deepEqual(await get(`/membresias/${m.id}/pagos`), []);

      const gastosAntes = Number(
        (await ctx.pool.query('SELECT COUNT(*) AS total FROM gastos WHERE usuario_id = $1', [ctx.a.usuario.id])).rows[0].total
      );

      // Pago 1: $199
      const res1 = await ctx.api
        .post(`/membresias/${m.id}/pagada`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.equal(res1.body.pago.membresia_id, m.id);
      assert.equal(res1.body.pago.monto, 199);
      assert.match(res1.body.pago.fecha, /^\d{4}-\d{2}-\d{2}$/);

      // Actualizar costo a $219 y registrar Pago 2
      await ctx.api
        .put(`/membresias/${m.id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .send(datos({ costo: 219, fecha_cobro: res1.body.membresia.fecha_cobro }))
        .expect(200);
      const res2 = await ctx.api
        .post(`/membresias/${m.id}/pagada`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      // Actualizar costo a $249 y registrar Pago 3
      await ctx.api
        .put(`/membresias/${m.id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .send(datos({ costo: 249, fecha_cobro: res2.body.membresia.fecha_cobro }))
        .expect(200);
      const res3 = await ctx.api
        .post(`/membresias/${m.id}/pagada`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      // Ajustar fechas históricas para validar ordenamiento por fecha descendente e id descendente
      await ctx.pool.query("UPDATE pagos_membresia SET fecha = '2026-09-15' WHERE id = $1", [res1.body.pago.id]);
      await ctx.pool.query("UPDATE pagos_membresia SET fecha = '2026-10-15' WHERE id = $1", [res2.body.pago.id]);
      await ctx.pool.query("UPDATE pagos_membresia SET fecha = '2026-11-15' WHERE id = $1", [res3.body.pago.id]);

      const pagos = await get(`/membresias/${m.id}/pagos`);
      assert.deepEqual(pagos, [
        { id: res3.body.pago.id, membresia_id: m.id, fecha: '2026-11-15', monto: 249 },
        { id: res2.body.pago.id, membresia_id: m.id, fecha: '2026-10-15', monto: 219 },
        { id: res1.body.pago.id, membresia_id: m.id, fecha: '2026-09-15', monto: 199 },
      ]);

      // No se creó ningún gasto en la tabla gastos y reportes siguen conciliando solo gasto fijo
      const gastosDespues = Number(
        (await ctx.pool.query('SELECT COUNT(*) AS total FROM gastos WHERE usuario_id = $1', [ctx.a.usuario.id])).rows[0].total
      );
      assert.equal(gastosDespues, gastosAntes);
      await conciliar(ctx.a, 0, 249, 249);
    });

    it('eliminar la membresía borra su historial en cascada sin afectar otras membresías', async () => {
      const m1 = await crear(datos({ nombre: 'Netflix', costo: 199 }));
      const m2 = await crear(datos({ nombre: 'Spotify', costo: 129 }));

      await ctx.api.post(`/membresias/${m1.id}/pagada`).auth(ctx.a.token, { type: 'bearer' }).expect(200);
      await ctx.api.post(`/membresias/${m1.id}/pagada`).auth(ctx.a.token, { type: 'bearer' }).expect(200);
      await ctx.api.post(`/membresias/${m2.id}/pagada`).auth(ctx.a.token, { type: 'bearer' }).expect(200);

      await ctx.api.delete(`/membresias/${m1.id}`).auth(ctx.a.token, { type: 'bearer' }).expect(200);

      const huerfanos = await ctx.pool.query('SELECT id FROM pagos_membresia WHERE membresia_id = $1', [m1.id]);
      assert.deepEqual(huerfanos.rows, []);

      const pagosM2 = await get(`/membresias/${m2.id}/pagos`);
      assert.equal(pagosM2.length, 1);
      assert.equal(pagosM2[0].monto, 129);
    });

    it('eliminar la cuenta (DELETE /auth/cuenta HU-68) borra el historial de pagos sin tocar el de otro usuario', async () => {
      const mA = await crear(datos({ nombre: 'Netflix A', costo: 199 }), ctx.a);
      const mB = await crear(datos({ nombre: 'Spotify B', costo: 129 }), ctx.b);

      await ctx.api.post(`/membresias/${mA.id}/pagada`).auth(ctx.a.token, { type: 'bearer' }).expect(200);
      await ctx.api.post(`/membresias/${mB.id}/pagada`).auth(ctx.b.token, { type: 'bearer' }).expect(200);

      await ctx.api
        .delete('/auth/cuenta')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ password: ctx.password })
        .expect(200);

      const pagosA = await ctx.pool.query('SELECT id FROM pagos_membresia WHERE membresia_id = $1', [mA.id]);
      assert.deepEqual(pagosA.rows, []);

      const pagosB = await get(`/membresias/${mB.id}/pagos`, ctx.b);
      assert.equal(pagosB.length, 1);
      assert.equal(pagosB[0].monto, 129);
    });

    it('aislamiento A/B, IDs inválidos y autenticación en GET /membresias/:id/pagos', async () => {
      const mA = await crear(datos(), ctx.a);

      expectError(
        await ctx.api.get(`/membresias/${mA.id}/pagos`).auth(ctx.b.token, { type: 'bearer' }),
        404,
        'MEMBRESIA_NO_ENCONTRADA'
      );

      for (const idInvalido of ['999999', '0', '-1', 'abc']) {
        expectError(
          await ctx.api.get(`/membresias/${idInvalido}/pagos`).auth(ctx.a.token, { type: 'bearer' }),
          404,
          'MEMBRESIA_NO_ENCONTRADA'
        );
      }

      for (const token of [null, 'token-invalido']) {
        const req = ctx.api.get(`/membresias/${mA.id}/pagos`);
        if (token) req.auth(token, { type: 'bearer' });
        expectError(await req, 401, 'NO_AUTORIZADO');
      }
    });
  });
});
